// Only keep imports needed for the Netlify handler at the top
import { IncomingForm } from 'formidable';
import type { Fields, Files } from 'formidable';
import { readFileSync } from 'fs';
import { PinataSDK } from 'pinata';
// @ts-ignore: File is available in Node.js 20+ and in web-std, but if not, use a polyfill or Buffer workaround

interface ImageUploadResult {
  success: boolean;
  ipfsUrl?: string;
  error?: string;
}

interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  buffer?: Buffer;
  originalName?: string;
}

/**
 * Validate image file meets requirements:
 * - Must be JPG or PNG
 * - Must be no more than 1MB
 */
async function validateImageBuffer(buffer: Buffer, originalName: string): Promise<ImageValidationResult> {
  try {
    // Check file size (1MB = 1024 * 1024 bytes)
    const maxSize = 1024 * 1024;
    if (buffer.length > maxSize) {
      return {
        isValid: false,
        error: `File size must be no more than 1MB (current: ${(buffer.length / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    // Check file type by extension and magic bytes
    const ext = originalName.toLowerCase().split('.').pop();
    if (!ext || !['jpg', 'jpeg', 'png'].includes(ext)) {
      return {
        isValid: false,
        error: 'File must be a JPG or PNG image'
      };
    }

    // Check magic bytes
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    
    if (!isPNG && !isJPEG) {
      return {
        isValid: false,
        error: 'File must be a valid JPG or PNG image'
      };
    }

    return {
      isValid: true,
      buffer,
      originalName
    };

  } catch (error) {
    return {
      isValid: false,
      error: 'Unable to validate image file'
    };
  }
}

// Pinata SDK setup
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY!,
});

/**
 * Upload image to Pinata using the SDK
 */
async function uploadToPinata(buffer: Buffer, filename: string): Promise<ImageUploadResult> {
  try {
    if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
      return {
        success: false,
        error: 'Pinata credentials not configured',
      };
    }
    // Use the native File class (Node.js 20+)
    const file = new File([buffer], filename, {
      type: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
    });
    const upload = await pinata.upload.public.file(file);
    // Always return IPFS URI as ipfs://<cid> (no filename)
    const ipfsUrl = `ipfs://${upload.cid}`;
    return {
      success: true,
      ipfsUrl,
    };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

// Netlify Function handler
export const handler = async (event: any) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Not implemented for Netlify (as before)
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ error: 'Server-side upload not implemented for Netlify. Please use client-side upload.' }),
  };
};

// For local development (Express.js)
export default async function(req: any, res: any) {
  // Move Node-only imports here
  const { IncomingForm } = await import('formidable');
  const { readFileSync } = await import('fs');
  const { PinataSDK } = await import('pinata');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new IncomingForm({ maxFileSize: 1024 * 1024, maxFiles: 1, allowEmptyFiles: false });

  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: 'Error parsing upload' });

    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!imageFile) return res.status(400).json({ error: 'No image file provided' });

    const buffer = readFileSync(imageFile.filepath);
    // Ensure originalFilename is always a string
    const originalFilename = imageFile.originalFilename || 'image.png';
    const validation = await validateImageBuffer(buffer, originalFilename);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    try {
      const result = await uploadToPinata(buffer, originalFilename);
      if (result.success) {
        return res.status(200).json({ success: true, ipfsUrl: result.ipfsUrl });
      } else {
        return res.status(500).json({ error: result.error });
      }
    } catch (e: any) {
      console.error('Pinata upload error:', e);
      return res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });
} 
// (All top-level Node-only imports removed)

import { uploadToPinata } from '../lib/pinata-upload';

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
  const { IncomingForm } = await import('formidable');
  const { readFileSync } = await import('fs');
  console.log('[UPLOAD] Received request', req.method, req.url);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new IncomingForm({ maxFileSize: 1024 * 1024, maxFiles: 1, allowEmptyFiles: false });

  form.parse(req, async (err, _fields, files) => {
    console.log('[UPLOAD] form.parse called', { err, files });
    if (err) return res.status(400).json({ error: 'Error parsing upload' });

    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!imageFile) {
      console.log('[UPLOAD] No image file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const buffer = readFileSync(imageFile.filepath);
    const originalFilename = imageFile.originalFilename || 'image.png';

    try {
      const result = await uploadToPinata(buffer, originalFilename);
      console.log('[UPLOAD] Pinata result', result);
      if (result.success) {
        return res.status(200).json({ success: true, ipfsUrl: result.ipfsUrl });
      } else {
        return res.status(500).json({ error: result.error });
      }
    } catch (e: any) {
      console.error('[UPLOAD] Pinata upload error:', e);
      return res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });
} 
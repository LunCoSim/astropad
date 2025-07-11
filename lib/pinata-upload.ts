import { PinataSDK } from 'pinata';
import { Blob, File } from 'buffer';

import { Readable } from 'stream';

type UploadInput = Buffer | Readable | Blob;

export interface UploadResult {
  success: boolean;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Shared Pinata upload function with improved error handling
 * @param input - File content as Buffer, Readable stream, or Blob
 * @param filename - Original filename
 * @param mimeType - Content type
 * @returns UploadResult with IPFS URL or error
 */
export async function uploadToPinata(
  input: UploadInput,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
    return { success: false, error: 'Missing Pinata configuration' };
  }
  
  const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY,
  });
  
  try {
    let blob: Blob;
    if (input instanceof Buffer) {
      blob = new Blob([input], { type: mimeType });
    } else if (input instanceof Readable) {
      const chunks = [];
      for await (const chunk of input) {
        chunks.push(chunk);
      }
      blob = new Blob(chunks, { type: mimeType });
    } else if (input instanceof Blob) {
      blob = input;
    } else {
      return { success: false, error: 'Unsupported input type' };
    }
    
    const fileObj = new File([blob], filename, { type: mimeType });
    const upload = await pinata.upload.public.file(fileObj);
    const ipfsUrl = `ipfs://${upload.cid}`;
    return { success: true, ipfsUrl };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
} 
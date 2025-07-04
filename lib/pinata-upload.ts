import { PinataSDK } from 'pinata';
import { File } from 'file-api';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY!,
});

export async function uploadToPinata(
  file: Buffer,
  filename?: string,
  mimeType: string = 'application/octet-stream'
): Promise<{ success: boolean; ipfsUrl?: string; error?: string }> {
  try {
    // Create a File object using the polyfill
    const fileObj = new File([file], filename || 'image.png', { type: mimeType });
    const upload = await pinata.upload.public.file(fileObj);
    const ipfsUrl = `ipfs://${upload.cid}`;
    return { success: true, ipfsUrl };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
} 
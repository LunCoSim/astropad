import { PinataSDK } from 'pinata';
import { Blob, File } from 'buffer';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY!,
});

export async function uploadToPinata(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ success: boolean; ipfsUrl?: string; error?: string }> {
  try {
    const blob = new Blob([file], { type: mimeType });
    const fileObj = new File([blob], filename, { type: mimeType });
    const upload = await pinata.upload.public.file(fileObj);
    const ipfsUrl = `ipfs://${upload.cid}`;
    return { success: true, ipfsUrl };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
} 
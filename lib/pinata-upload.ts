import axios from 'axios';
import FormData from 'form-data';

export async function uploadToPinata(
  file: Buffer, // Only accept Buffer in Node.js
  filename?: string
): Promise<{ success: boolean; ipfsUrl?: string; error?: string }> {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY;
  if (!pinataJwt || !pinataGateway) {
    return { success: false, error: "Pinata credentials not configured" };
  }

  try {
    const formData = new FormData();
    formData.append('file', file, filename || 'image.png');

    const res = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${pinataJwt}`,
        },
      }
    );
    const ipfsUrl = `ipfs://${res.data.IpfsHash}`;
    return { success: true, ipfsUrl };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
} 
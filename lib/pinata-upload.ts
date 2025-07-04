export async function uploadToPinata(
  file: Buffer | File,
  filename?: string
): Promise<{ success: boolean; ipfsUrl?: string; error?: string }> {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY;
  if (!pinataJwt || !pinataGateway) {
    return { success: false, error: "Pinata credentials not configured" };
  }

  try {
    const { PinataSDK } = await import('pinata');
    let fileObj: File;
    let name = filename;

    if (typeof Buffer !== 'undefined' && file instanceof Buffer) {
      name = filename || 'image.png';
      fileObj = new File([file], name, {
        type: name.endsWith('.png') ? 'image/png' : 'image/jpeg',
      });
    } else {
      fileObj = file as File;
      name = filename || fileObj.name || 'image.png';
    }

    const pinata = new PinataSDK({
      pinataJwt,
      pinataGateway,
    });
    const upload = await pinata.upload.public.file(fileObj);
    const ipfsUrl = `ipfs://${upload.cid}`;
    return { success: true, ipfsUrl };
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
} 
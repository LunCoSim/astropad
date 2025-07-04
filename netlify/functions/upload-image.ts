import { IncomingForm } from 'formidable';
import { uploadToPinata } from '../../lib/pinata-upload';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (request: Request) => {
  const logs: string[] = [];
  const log = (msg: string, ...args: any[]) => {
    const line = `[upload-image] ${msg} ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
    logs.push(line);
    if (typeof console !== 'undefined') console.log(line);
  };
  const logErr = (msg: string, ...args: any[]) => {
    const line = `[upload-image] ERROR: ${msg} ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
    logs.push(line);
    if (typeof console !== 'undefined') console.error(line);
  };

  log('Function invoked');
  log('Request method:', request.method);
  // Log headers
  const headerArr: [string, string][] = [];
  for (const pair of request.headers as any) {
    headerArr.push(pair);
  }
  log('Request headers:', JSON.stringify(headerArr));

  try {
    if (request.method === 'OPTIONS') {
      log('Handling OPTIONS request');
      return new Response('', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (request.method !== 'POST') {
      logErr('Method Not Allowed:', request.method);
      return new Response(JSON.stringify({ error: 'Method Not Allowed', logs }), { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Parse multipart form data using formidable
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let fileType = '';
    try {
      log('Parsing form data with formidable');
      // Netlify provides the raw body as a ReadableStream
      // Convert Request to Node.js IncomingMessage using a workaround
      // This is a hack, but Netlify Functions are Node.js, so we can use req/res
      // @ts-ignore
      const req = request as any;
      const form = new IncomingForm();
      const formParse: Promise<any> = new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
      const { files } = await formParse;
      log('Formidable files:', JSON.stringify(Object.keys(files)));
      const imageFile = files.image;
      if (!imageFile) {
        logErr('No file uploaded');
        return new Response(JSON.stringify({ error: 'No file uploaded', logs }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
      fileBuffer = imageFile[0]?.buffer || null;
      fileName = imageFile[0]?.originalFilename || 'image.png';
      fileType = imageFile[0]?.mimetype || 'application/octet-stream';
      log('File details:', JSON.stringify({ fileName, fileType, size: fileBuffer?.length }));
    } catch (err) {
      logErr('Failed to parse form data:', String(err));
      return new Response(JSON.stringify({ error: 'Failed to parse form data', details: String(err), logs }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Check Pinata env vars presence (not values)
    const pinataJwtPresent = !!process.env.PINATA_JWT;
    const pinataGatewayPresent = !!process.env.PINATA_GATEWAY;
    log('Pinata JWT present:', String(pinataJwtPresent));
    log('Pinata Gateway present:', String(pinataGatewayPresent));

    let result;
    try {
      result = await uploadToPinata(fileBuffer, fileName);
      log('Pinata upload result:', JSON.stringify(result));
    } catch (err) {
      logErr('Error uploading to Pinata:', String(err));
      return new Response(JSON.stringify({ error: 'Pinata upload failed', details: String(err), logs }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!result.success) {
      logErr('Pinata upload error:', result.error || 'Unknown error from Pinata');
      return new Response(JSON.stringify({ error: result.error || 'Unknown error from Pinata', logs }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    log('Upload successful, returning result');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    logErr('Unexpected server error:', String(err));
    return new Response(JSON.stringify({ error: 'Unexpected server error', details: String(err), logs }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}; 
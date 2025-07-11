import { uploadToPinata } from '../../lib/pinata-upload';
import { Buffer } from 'buffer';

// Helper to parse multipart form data (simple, for single file)
function parseMultipart(event: any) {
  const logs: string[] = [];
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  logs.push(`[parseMultipart] Content-Type: ${contentType}`);
  if (!contentType || !contentType.startsWith('multipart/form-data')) {
    logs.push('[parseMultipart] Not multipart/form-data');
    return { error: 'Invalid content-type', logs };
  }
  const boundaryMatch = contentType.match(/boundary=(.*)$/);
  if (!boundaryMatch) {
    logs.push('[parseMultipart] No boundary found');
    return { error: 'No boundary in content-type', logs };
  }
  const boundary = boundaryMatch[1];
  const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
  const parts = bodyBuffer.toString().split(`--${boundary}`);
  for (const part of parts) {
    if (part.includes('Content-Disposition') && part.includes('filename=')) {
      // Extract filename
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);
      if (!filenameMatch) continue;
      const filename = filenameMatch[1];
      const contentType = typeMatch ? typeMatch[1] : 'application/octet-stream';
      // Extract file data (after double CRLF)
      const fileDataMatch = part.match(/\r\n\r\n([\s\S]*)\r\n$/);
      if (!fileDataMatch) continue;
      const fileData = Buffer.from(fileDataMatch[1], 'binary');
      logs.push(`[parseMultipart] Found file: ${filename}, type: ${contentType}, size: ${fileData.length}`);
      return { file: fileData, filename, contentType, logs };
    }
  }
  logs.push('[parseMultipart] No file part found');
  return { error: 'No file found in form data', logs };
}

export const handler = async (event: any, context: any) => {
  const logs: string[] = [];
  logs.push('[handler] Function invoked');
  logs.push(`[handler] Method: ${event.httpMethod}`);
  logs.push(`[handler] Headers: ${JSON.stringify(event.headers)}`);
  logs.push(`[handler] Request from: ${event.headers['x-forwarded-for'] || 'unknown'}`);

  if (event.httpMethod === 'OPTIONS') {
    logs.push('[handler] Handling OPTIONS');
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
      body: '',
    };
  }
  if (event.httpMethod !== 'POST') {
    logs.push('[handler] Method Not Allowed');
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed', logs }),
    };
  }

  // Parse multipart form data
  let fileBuffer: Buffer | undefined, filename: string | undefined, fileType: string | undefined, parseLogs;
  try {
    const parsed = parseMultipart(event);
    parseLogs = parsed.logs;
    logs.push(...parseLogs);
    if (parsed.error) {
      logs.push(`[handler] Parse error: ${parsed.error}`);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: parsed.error, logs }),
      };
    }
    fileBuffer = parsed.file;
    filename = parsed.filename;
    fileType = parsed.contentType;
    if (!fileBuffer || !filename || !fileType) {
      logs.push('[handler] Missing file, filename, or fileType after parsing');
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing file, filename, or fileType', logs }),
      };
    }
  } catch (err) {
    logs.push(`[handler] Exception parsing form: ${String(err)}`);
    logs.push(`Error details: ${err.stack}`);
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to parse form data', details: String(err), logs }),
    };
  }

  // Check Pinata env vars presence (not values)
  const pinataJwtPresent = !!process.env.PINATA_JWT;
  const pinataGatewayPresent = !!process.env.PINATA_GATEWAY;
  logs.push(`[handler] Pinata JWT present: ${pinataJwtPresent}`);
  logs.push(`[handler] Pinata Gateway present: ${pinataGatewayPresent}`);

  let result;
  try {
    result = await uploadToPinata(fileBuffer, filename, fileType);
    logs.push(`[handler] Pinata upload result: ${JSON.stringify(result)}`);
  } catch (err) {
    logs.push(`[handler] Pinata upload exception: ${String(err)}`);
    logs.push(`Error details: ${err.stack}`);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Pinata upload failed', details: String(err), logs }),
    };
  }

  if (!result.success) {
    logs.push(`[handler] Pinata upload error: ${result.error || 'Unknown error from Pinata'}`);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: result.error || 'Unknown error from Pinata', logs }),
    };
  }

  logs.push('[handler] Upload successful, returning result');
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ...result, logs }),
  };
}; 
import { uploadToPinata } from "../../lib/pinata-upload";

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

  log("Function invoked");
  log("Request method:", request.method);
  // Convert headers to array for logging
  const headerArr: [string, string][] = [];
  for (const pair of request.headers as any) {
    headerArr.push(pair);
  }
  log("Request headers:", JSON.stringify(headerArr));
  try {
    if (request.method === "OPTIONS") {
      log("Handling OPTIONS request");
      return new Response("", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
    }
    if (request.method !== "POST") {
      logErr("Method Not Allowed:", request.method);
      return new Response(JSON.stringify({ error: "Method Not Allowed", logs }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
      // Convert formData to array of keys for logging
      const keys: string[] = [];
      for (const [key] of (formData as any)) {
        keys.push(key);
      }
      log("Form data keys:", JSON.stringify(keys));
    } catch (err) {
      logErr("Failed to parse form data:", String(err));
      return new Response(JSON.stringify({ error: "Failed to parse form data", details: String(err), logs }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    const file = formData.get("image") as File;
    if (!file) {
      logErr("No file uploaded");
      return new Response(JSON.stringify({ error: "No file uploaded", logs }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    log("File details:", JSON.stringify({
      name: (file as any).name,
      type: file.type,
      size: file.size
    }));

    // Check Pinata env vars presence (not values)
    const pinataJwtPresent = !!process.env.PINATA_JWT;
    const pinataGatewayPresent = !!process.env.PINATA_GATEWAY;
    log("Pinata JWT present:", String(pinataJwtPresent));
    log("Pinata Gateway present:", String(pinataGatewayPresent));

    let result;
    try {
      result = await uploadToPinata(file);
      log("Pinata upload result:", JSON.stringify(result));
    } catch (err) {
      logErr("Error uploading to Pinata:", String(err));
      return new Response(JSON.stringify({ error: "Pinata upload failed", details: String(err), logs }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (!result.success) {
      logErr("Pinata upload error:", result.error || "Unknown error from Pinata");
      return new Response(JSON.stringify({ error: result.error || "Unknown error from Pinata", logs }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    log("Upload successful, returning result");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    logErr("Unexpected server error:", String(err));
    return new Response(JSON.stringify({ error: "Unexpected server error", details: String(err), logs }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}; 
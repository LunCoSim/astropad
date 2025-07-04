import { uploadToPinata } from "../../lib/pinata-upload";

export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File;
  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
  }

  const result = await uploadToPinata(file);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}; 
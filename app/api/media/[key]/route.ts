import { ensureSchema, getDb } from "@/db";

const seedFiles: Record<string, string> = {
  "seed-1": "climbing-fail-01.gif",
  "seed-2": "climbing-fail-02.gif",
  "seed-3": "climbing-fail-03.gif",
  "seed-4": "climbing-fail-04.gif",
  "seed-5": "climbing-fail-05.gif",
};

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(key)) return new Response("INVALID ID", { status: 400 });

  let source: string;
  let filename: string;
  if (seedFiles[key]) {
    source = new URL(`/gifs/${seedFiles[key]}`, request.url).toString();
    filename = seedFiles[key];
  } else {
    await ensureSchema();
    const rows = await getDb()`SELECT object_url, filename FROM memes WHERE id = ${key} LIMIT 1`;
    if (!rows[0]) return new Response("NOT FOUND", { status: 404 });
    source = String(rows[0].object_url);
    filename = String(rows[0].filename);
  }

  const response = await fetch(source);
  if (!response.ok || !response.body) return new Response("NOT FOUND", { status: 404 });
  const headers = new Headers({
    "content-type": response.headers.get("content-type") || "image/gif",
    "cache-control": "public, max-age=31536000, immutable",
  });
  if (new URL(request.url).searchParams.has("download")) {
    headers.set("content-disposition", `attachment; filename="${filename.replace(/["\\]/g, "")}"`);
  }
  return new Response(response.body, { headers });
}

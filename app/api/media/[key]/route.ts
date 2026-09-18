import { ensureSchema, getDb } from "@/db";
import { reverseGif } from "@/lib/reverse-gif";

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(key)) return new Response("INVALID ID", { status: 400 });

  await ensureSchema();
  const rows = await getDb()`SELECT object_url, filename FROM memes WHERE id = ${key} LIMIT 1`;
  if (!rows[0]) return new Response("NOT FOUND", { status: 404 });
  const source = String(rows[0].object_url);
  const filename = String(rows[0].filename);

  const response = await fetch(source);
  if (!response.ok || !response.body) return new Response("NOT FOUND", { status: 404 });
  const reversed = new URL(request.url).searchParams.has("reverse");
  const headers = new Headers({
    "content-type": response.headers.get("content-type") || "image/gif",
    "cache-control": "public, max-age=31536000, immutable",
  });
  if (new URL(request.url).searchParams.has("download")) {
    const safeFilename = filename.replace(/["\\]/g, "");
    headers.set("content-disposition", `attachment; filename="${reversed ? `reversed-${safeFilename}` : safeFilename}"`);
  }
  if (!reversed) return new Response(response.body, { headers });

  try {
    return new Response(reverseGif(await response.arrayBuffer()), { headers });
  } catch {
    return new Response("GIF COULD NOT BE REVERSED", { status: 422 });
  }
}

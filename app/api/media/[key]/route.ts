import { getFiles } from "@/db";

export const runtime = "edge";

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const object = await getFiles().get(decodeURIComponent(key));
  if (!object) return new Response("NOT FOUND", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (new URL(request.url).searchParams.has("download")) {
    headers.set("content-disposition", `attachment; filename="climbing-fail-${object.key.split("/").pop()}"`);
  }
  return new Response(object.body, { headers });
}

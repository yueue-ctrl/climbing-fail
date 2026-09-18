import { del } from "@vercel/blob";
import { ensureSchema, getDb } from "@/db";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const requestUrl = new URL(request.url);
  const sameOrigin = request.headers.get("origin") === requestUrl.origin;
  const adminTrigger = request.headers.get("x-admin-trigger")?.toLowerCase() === "zy";

  if (!sameOrigin || !adminTrigger) return new Response("FORBIDDEN", { status: 403 });
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response("INVALID ID", { status: 400 });

  await ensureSchema();
  const sql = getDb();
  const rows = await sql`SELECT object_url FROM memes WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return new Response("NOT FOUND", { status: 404 });

  await sql`DELETE FROM comments WHERE meme_id = ${id}`;
  await sql`DELETE FROM engagement WHERE meme_id = ${id}`;
  await sql`DELETE FROM memes WHERE id = ${id}`;
  await del(String(rows[0].object_url)).catch(() => undefined);

  return new Response(null, { status: 204 });
}

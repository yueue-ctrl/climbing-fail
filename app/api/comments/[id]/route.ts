import { ensureSchema, getDb } from "@/db";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const requestUrl = new URL(request.url);
  const sameOrigin = request.headers.get("origin") === requestUrl.origin;
  const adminTrigger = request.headers.get("x-admin-trigger")?.toLowerCase() === "zy";
  if (!sameOrigin || !adminTrigger) return new Response("FORBIDDEN", { status: 403 });
  if (!/^\d+$/.test(id)) return new Response("INVALID COMMENT", { status: 400 });

  await ensureSchema();
  const sql = getDb();
  const rows = await sql`SELECT meme_id FROM comments WHERE id = ${Number(id)} LIMIT 1`;
  if (!rows[0]) return new Response("NOT FOUND", { status: 404 });
  const memeId = String(rows[0].meme_id);

  await sql`DELETE FROM comments WHERE id = ${Number(id)}`;
  const remaining = await sql`
    SELECT id, author, body, created_at
    FROM comments WHERE meme_id = ${memeId}
    ORDER BY created_at DESC, id DESC LIMIT 1
  `;
  const counts = await sql`SELECT COUNT(*) AS count FROM comments WHERE meme_id = ${memeId}`;
  const latest = remaining[0] ? {
    author: String(remaining[0].author),
    body: String(remaining[0].body),
  } : undefined;

  return Response.json({ memeId, commentCount: Number(counts[0]?.count ?? 0), latestComment: latest });
}

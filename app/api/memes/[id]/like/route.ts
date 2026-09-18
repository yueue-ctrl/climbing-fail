import { ensureSchema, getDb } from "@/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(id)) return new Response("INVALID ID", { status: 400 });
  await ensureSchema();
  const rows = await getDb()`
    INSERT INTO engagement (meme_id, likes) VALUES (${id}, 1)
    ON CONFLICT (meme_id) DO UPDATE SET likes = engagement.likes + 1
    RETURNING likes
  `;
  return Response.json({ likes: Number(rows[0]?.likes ?? 1) });
}

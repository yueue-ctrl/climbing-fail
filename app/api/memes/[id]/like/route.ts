import { getDb } from "@/db";

export const runtime = "edge";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(id)) return new Response("INVALID ID", { status: 400 });
  await getDb().prepare(
    `INSERT INTO engagement (meme_id, likes) VALUES (?, 1)
     ON CONFLICT(meme_id) DO UPDATE SET likes = likes + 1`,
  ).bind(id).run();
  const row = await getDb().prepare("SELECT likes FROM engagement WHERE meme_id = ?").bind(id).first<{ likes: number }>();
  return Response.json({ likes: row?.likes ?? 1 });
}

import { getDb } from "@/db";

export const runtime = "edge";

function validId(id: string) { return /^[a-zA-Z0-9-]{1,64}$/.test(id); }

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return new Response("INVALID ID", { status: 400 });
  const result = await getDb().prepare(
    "SELECT id, author, body, created_at AS createdAt FROM comments WHERE meme_id = ? ORDER BY created_at ASC LIMIT 100",
  ).bind(id).all();
  return Response.json(result.results);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return new Response("INVALID ID", { status: 400 });
  const form = await request.formData();
  const author = String(form.get("author") || "").trim().slice(0, 24);
  const body = String(form.get("body") || "").trim().slice(0, 180);
  if (!author || !body) return new Response("NAME AND COMMENT REQUIRED", { status: 400 });
  const createdAt = Date.now();
  const result = await getDb().prepare(
    "INSERT INTO comments (meme_id, author, body, created_at) VALUES (?, ?, ?, ?) RETURNING id",
  ).bind(id, author, body, createdAt).first<{ id: number }>();
  return Response.json({ id: result?.id, author, body, createdAt }, { status: 201 });
}

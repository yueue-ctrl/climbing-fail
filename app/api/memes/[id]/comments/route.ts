import { ensureSchema, getDb } from "@/db";

function validId(id: string) { return /^[a-zA-Z0-9-]{1,64}$/.test(id); }

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return new Response("INVALID ID", { status: 400 });
  await ensureSchema();
  const rows = await getDb()`
    SELECT id, author, body, created_at AS "createdAt"
    FROM comments WHERE meme_id = ${id}
    ORDER BY created_at ASC LIMIT 100
  `;
  return Response.json(rows.map((row) => ({ ...row, id: Number(row.id), createdAt: Number(row.createdAt) })));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return new Response("INVALID ID", { status: 400 });
  const form = await request.formData();
  const authorValue = form.get("author");
  const bodyValue = form.get("body");
  const author = (typeof authorValue === "string" ? authorValue : "").trim().slice(0, 24);
  const body = (typeof bodyValue === "string" ? bodyValue : "").trim().slice(0, 180);
  if (!author || !body) return new Response("NAME AND COMMENT REQUIRED", { status: 400 });
  const createdAt = Date.now();
  await ensureSchema();
  const rows = await getDb()`
    INSERT INTO comments (meme_id, author, body, created_at)
    VALUES (${id}, ${author}, ${body}, ${createdAt}) RETURNING id
  `;
  return Response.json({ id: Number(rows[0]?.id), author, body, createdAt }, { status: 201 });
}

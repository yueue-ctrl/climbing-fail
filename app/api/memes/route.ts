import { del } from "@vercel/blob";
import { ensureSchema, getDb } from "@/db";

type UploadInput = { id?: string; filename?: string; pathname?: string; url?: string };

function validBlob(input: UploadInput) {
  if (!input.id || !/^[a-f0-9-]{36}$/i.test(input.id)) return false;
  if (input.pathname !== `uploads/${input.id}.gif`) return false;
  if (!input.url || !input.filename) return false;
  try {
    return new URL(input.url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const sql = getDb();
    const uploads = await sql`
      SELECT m.id, m.category, m.filename, m.object_url AS url, m.created_at,
             COALESCE(e.likes, 0) AS likes,
             COALESCE((SELECT COUNT(*) FROM comments c WHERE c.meme_id = m.id), 0) AS comment_count,
             (SELECT c.author FROM comments c WHERE c.meme_id = m.id
              ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS latest_comment_author,
             (SELECT c.body FROM comments c WHERE c.meme_id = m.id
              ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS latest_comment_body
      FROM memes m LEFT JOIN engagement e ON e.meme_id = m.id
      ORDER BY m.created_at DESC
    `;
    return Response.json(uploads.map((row) => ({
      id: String(row.id),
      category: String(row.category),
      filename: String(row.filename),
      url: String(row.url),
      likes: Number(row.likes),
      commentCount: Number(row.comment_count),
      latestComment: row.latest_comment_body ? {
        author: String(row.latest_comment_author),
        body: String(row.latest_comment_body),
      } : undefined,
      createdAt: Number(row.created_at),
      uploaded: true,
    })));
  } catch {
    return Response.json([]);
  }
}

export async function POST(request: Request) {
  const input = await request.json() as UploadInput;
  if (!validBlob(input)) return new Response("INVALID UPLOAD", { status: 400 });
  const filename = input.filename!.slice(0, 120);
  const createdAt = Date.now();
  try {
    await ensureSchema();
    const sql = getDb();
    await sql`
      INSERT INTO memes (id, category, filename, object_key, object_url, created_at)
      VALUES (${input.id!}, 'OTHER', ${filename}, ${input.pathname!}, ${input.url!}, ${createdAt})
    `;
    return Response.json({
      id: input.id, category: "OTHER", filename, url: input.url,
      likes: 0, commentCount: 0, createdAt, uploaded: true,
    }, { status: 201 });
  } catch (error) {
    await del(input.url!).catch(() => undefined);
    throw error;
  }
}

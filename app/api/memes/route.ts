import { del } from "@vercel/blob";
import { ensureSchema, getDb } from "@/db";

const seed = [
  { id: "seed-1", category: "OTHER", url: "/gifs/climbing-fail-01.gif", filename: "climbing-fail-01.gif" },
  { id: "seed-2", category: "OTHER", url: "/gifs/climbing-fail-02.gif", filename: "climbing-fail-02.gif" },
  { id: "seed-3", category: "OTHER", url: "/gifs/climbing-fail-03.gif", filename: "climbing-fail-03.gif" },
  { id: "seed-4", category: "OTHER", url: "/gifs/climbing-fail-04.gif", filename: "climbing-fail-04.gif" },
  { id: "seed-5", category: "OTHER", url: "/gifs/climbing-fail-05.gif", filename: "climbing-fail-05.gif" },
];

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
             COALESCE(e.likes, 0) AS likes
      FROM memes m LEFT JOIN engagement e ON e.meme_id = m.id
      ORDER BY m.created_at DESC
    `;
    const seedLikes = await sql`SELECT meme_id, likes FROM engagement WHERE meme_id LIKE 'seed-%'`;
    const likes = new Map(seedLikes.map((row) => [String(row.meme_id), Number(row.likes)]));
    return Response.json([
      ...uploads.map((row) => ({
        id: String(row.id),
        category: String(row.category),
        filename: String(row.filename),
        url: String(row.url),
        likes: Number(row.likes),
        createdAt: Number(row.created_at),
        uploaded: true,
      })),
      ...seed.map((item) => ({ ...item, likes: likes.get(item.id) ?? 0, uploaded: false })),
    ]);
  } catch {
    return Response.json(seed.map((item) => ({ ...item, likes: 0, uploaded: false })));
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
      likes: 0, createdAt, uploaded: true,
    }, { status: 201 });
  } catch (error) {
    await del(input.url!).catch(() => undefined);
    throw error;
  }
}

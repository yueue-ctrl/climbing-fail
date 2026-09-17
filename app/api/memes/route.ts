import { getDb, getFiles } from "@/db";

export const runtime = "edge";

const seed = [
  { id: "seed-1", category: "SLIP", url: "/gifs/climbing-fail-01.gif", filename: "climbing-fail-01.gif" },
  { id: "seed-2", category: "SWING", url: "/gifs/climbing-fail-02.gif", filename: "climbing-fail-02.gif" },
  { id: "seed-3", category: "GRAVITY", url: "/gifs/climbing-fail-03.gif", filename: "climbing-fail-03.gif" },
  { id: "seed-4", category: "GRAVITY", url: "/gifs/climbing-fail-04.gif", filename: "climbing-fail-04.gif" },
  { id: "seed-5", category: "SLIP", url: "/gifs/climbing-fail-05.gif", filename: "climbing-fail-05.gif" },
];

type UploadRow = {
  id: string;
  category: string;
  filename: string;
  object_key: string;
  likes: number | null;
  created_at: number;
};

export async function GET() {
  try {
    const result = await getDb().prepare(
      `SELECT m.id, m.category, m.filename, m.object_key, m.created_at, COALESCE(e.likes, 0) AS likes
       FROM memes m LEFT JOIN engagement e ON e.meme_id = m.id
       ORDER BY m.created_at DESC`,
    ).all<UploadRow>();
    const seedLikes = await getDb().prepare(
      `SELECT meme_id, likes FROM engagement WHERE meme_id LIKE 'seed-%'`,
    ).all<{ meme_id: string; likes: number }>();
    const likes = new Map(seedLikes.results.map((row) => [row.meme_id, row.likes]));
    return Response.json([
      ...result.results.map((row) => ({
        id: row.id,
        category: row.category,
        filename: row.filename,
        url: `/api/media/${encodeURIComponent(row.object_key)}`,
        likes: row.likes ?? 0,
        createdAt: row.created_at,
        uploaded: true,
      })),
      ...seed.map((item) => ({ ...item, likes: likes.get(item.id) ?? 0, uploaded: false })),
    ]);
  } catch {
    return Response.json(seed.map((item) => ({ ...item, likes: 0, uploaded: false })));
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") || "OTHER").toUpperCase();
  if (!(file instanceof File) || file.type !== "image/gif") return new Response("GIF REQUIRED", { status: 400 });
  if (file.size > 6 * 1024 * 1024) return new Response("GIF IS TOO LARGE", { status: 413 });
  if (!["SLIP", "SWING", "GRAVITY", "OTHER"].includes(category)) return new Response("INVALID CATEGORY", { status: 400 });

  const id = crypto.randomUUID();
  const key = `${id}.gif`;
  const createdAt = Date.now();
  await getFiles().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "image/gif", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name.slice(0, 120) },
  });
  try {
    await getDb().prepare(
      "INSERT INTO memes (id, category, filename, object_key, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, category, file.name.slice(0, 120), key, createdAt).run();
  } catch (error) {
    await getFiles().delete(key);
    throw error;
  }
  return Response.json({
    id,
    category,
    filename: file.name.slice(0, 120),
    url: `/api/media/${encodeURIComponent(key)}`,
    likes: 0,
    createdAt,
    uploaded: true,
  }, { status: 201 });
}

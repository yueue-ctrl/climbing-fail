import { getDb, getFiles } from "@/db";

export const runtime = "edge";

const brokenUploads = [
  ["0b255061-6cc8-432a-b0b9-89ea9545d9b8", "0b255061-6cc8-432a-b0b9-89ea9545d9b8.gif"],
  ["baed6e8c-1c80-402a-8c23-59907d8f0603", "baed6e8c-1c80-402a-8c23-59907d8f0603.gif"],
] as const;

export async function GET() {
  const db = getDb();
  for (const [id, key] of brokenUploads) {
    await db.batch([
      db.prepare("DELETE FROM comments WHERE meme_id = ?").bind(id),
      db.prepare("DELETE FROM engagement WHERE meme_id = ?").bind(id),
      db.prepare("DELETE FROM memes WHERE id = ? AND object_key = ?").bind(id, key),
    ]);
    await getFiles().delete(key);
  }
  return Response.json({ removed: brokenUploads.map(([id]) => id) });
}

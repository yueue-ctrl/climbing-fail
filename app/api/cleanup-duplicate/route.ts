import { getDb, getFiles } from "@/db";

export const runtime = "edge";

const duplicateId = "0df617e6-2921-4f26-a662-849f7c0418df";
const duplicateKey = "0df617e6-2921-4f26-a662-849f7c0418df.gif";

export async function GET() {
  const db = getDb();
  await db.batch([
    db.prepare("DELETE FROM comments WHERE meme_id = ?").bind(duplicateId),
    db.prepare("DELETE FROM engagement WHERE meme_id = ?").bind(duplicateId),
    db.prepare("DELETE FROM memes WHERE id = ? AND object_key = ?").bind(duplicateId, duplicateKey),
  ]);
  await getFiles().delete(duplicateKey);
  return Response.json({ removed: duplicateId });
}

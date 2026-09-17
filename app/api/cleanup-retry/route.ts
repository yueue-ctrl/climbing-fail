import { getDb, getFiles } from "@/db";

export const runtime = "edge";

const olderRetryId = "809e0f62-2a61-4dfa-a5ea-ad33bcc85c56";
const olderRetryKey = "809e0f62-2a61-4dfa-a5ea-ad33bcc85c56.gif";

export async function GET() {
  const db = getDb();
  await db.batch([
    db.prepare("DELETE FROM comments WHERE meme_id = ?").bind(olderRetryId),
    db.prepare("DELETE FROM engagement WHERE meme_id = ?").bind(olderRetryId),
    db.prepare("DELETE FROM memes WHERE id = ? AND object_key = ?").bind(olderRetryId, olderRetryKey),
  ]);
  await getFiles().delete(olderRetryKey);
  return Response.json({ removed: olderRetryId });
}

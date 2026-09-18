import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | undefined;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

export async function ensureSchema() {
  if (!schemaReady) {
    const sql = getDb();
    schemaReady = Promise.all([
      sql`CREATE TABLE IF NOT EXISTS memes (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        filename TEXT NOT NULL,
        object_key TEXT NOT NULL UNIQUE,
        object_url TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`,
      sql`CREATE TABLE IF NOT EXISTS engagement (
        meme_id TEXT PRIMARY KEY,
        likes INTEGER NOT NULL DEFAULT 0
      )`,
      sql`CREATE TABLE IF NOT EXISTS comments (
        id BIGSERIAL PRIMARY KEY,
        meme_id TEXT NOT NULL,
        author TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`,
    ]).then(() => undefined).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

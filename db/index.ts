import { env } from "cloudflare:workers";

export function getDb(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export function getFiles(): R2Bucket {
  if (!env.FILES) throw new Error("R2 binding FILES is unavailable");
  return env.FILES;
}

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const memes = sqliteTable(
  "memes",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    filename: text("filename").notNull(),
    objectKey: text("object_key").notNull().unique(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_memes_created_at").on(table.createdAt)],
);

export const engagement = sqliteTable("engagement", {
  memeId: text("meme_id").primaryKey(),
  likes: integer("likes").notNull().default(0),
});

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memeId: text("meme_id").notNull(),
    author: text("author").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_comments_meme_created").on(table.memeId, table.createdAt)],
);

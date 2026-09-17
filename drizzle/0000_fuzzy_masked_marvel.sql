CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meme_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_comments_meme_created` ON `comments` (`meme_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `engagement` (
	`meme_id` text PRIMARY KEY NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memes` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memes_object_key_unique` ON `memes` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_memes_created_at` ON `memes` (`created_at`);
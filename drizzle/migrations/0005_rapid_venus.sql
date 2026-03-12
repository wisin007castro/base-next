CREATE TABLE `user_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`jti` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_used_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_jti_unique` ON `user_sessions` (`jti`);--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_expires_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_enabled` integer DEFAULT false NOT NULL;
-- Hecha a mano: SQLite no admite ADD COLUMN con default no constante (created_at) ni añadir
-- ON DELETE a una FK; se reconstruye la tabla conservando las filas (todas pasan a 'grant').
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_permissions` (
	`user_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	`effect` text DEFAULT 'grant' NOT NULL,
	`reason` text,
	`expires_at` text,
	`granted_by_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`user_id`, `permission_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_user_permissions`(`user_id`, `permission_id`) SELECT `user_id`, `permission_id` FROM `user_permissions`;--> statement-breakpoint
DROP TABLE `user_permissions`;--> statement-breakpoint
ALTER TABLE `__new_user_permissions` RENAME TO `user_permissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

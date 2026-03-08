CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`primer_apellido` text NOT NULL,
	`segundo_apellido` text,
	`tipo_documento` text NOT NULL,
	`numero_documento` text NOT NULL,
	`fecha_nacimiento` text NOT NULL,
	`genero` text DEFAULT 'prefiero_no_decir' NOT NULL,
	`telefono` text,
	`telefono_alternativo` text,
	`pais` text,
	`departamento` text,
	`ciudad` text,
	`direccion` text,
	`codigo_postal` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` text,
	`password` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`role` text DEFAULT 'usuario' NOT NULL,
	`remember_token` text,
	`last_login_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
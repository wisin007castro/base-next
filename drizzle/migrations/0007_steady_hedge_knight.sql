CREATE TABLE `etiquetas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `etiquetas_nombre_unique` ON `etiquetas` (`nombre`);--> statement-breakpoint
CREATE TABLE `publicaciones_etiquetas` (
	`publicacion_id` integer NOT NULL,
	`etiqueta_id` integer NOT NULL,
	PRIMARY KEY(`publicacion_id`, `etiqueta_id`),
	FOREIGN KEY (`publicacion_id`) REFERENCES `publicaciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publicaciones_etiquetas_etiqueta_id_idx` ON `publicaciones_etiquetas` (`etiqueta_id`);--> statement-breakpoint
DROP INDEX `categorias_nombre_unique`;--> statement-breakpoint
ALTER TABLE `categorias` ADD `deleted_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`) WHERE "categorias"."deleted_at" is null;--> statement-breakpoint
DROP INDEX `users_username_unique`;--> statement-breakpoint
DROP INDEX `users_email_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`) WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`) WHERE "users"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE `publicaciones` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `publicaciones_categoria_id_idx` ON `publicaciones` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `publicaciones_autor_id_idx` ON `publicaciones` (`autor_id`);
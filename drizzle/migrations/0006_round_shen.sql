CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`);--> statement-breakpoint
CREATE TABLE `comentarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`publicacion_id` integer NOT NULL,
	`autor_id` integer NOT NULL,
	`contenido` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`publicacion_id`) REFERENCES `publicaciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comentarios_publicacion_idx` ON `comentarios` (`publicacion_id`);--> statement-breakpoint
CREATE TABLE `publicaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`resumen` text,
	`contenido` text NOT NULL,
	`categoria_id` integer NOT NULL,
	`publicada` integer DEFAULT false NOT NULL,
	`fecha_publicacion` text,
	`autor_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `votos` (
	`publicacion_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`valor` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`publicacion_id`, `user_id`),
	FOREIGN KEY (`publicacion_id`) REFERENCES `publicaciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

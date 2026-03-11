PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`primer_apellido` text,
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
	`avatar_key` text,
	`avatar_url` text,
	`avatar_thumb_key` text,
	`avatar_thumb_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_profiles`("id", "user_id", "nombre", "primer_apellido", "segundo_apellido", "tipo_documento", "numero_documento", "fecha_nacimiento", "genero", "telefono", "telefono_alternativo", "pais", "departamento", "ciudad", "direccion", "codigo_postal", "avatar_key", "avatar_url", "avatar_thumb_key", "avatar_thumb_url", "created_at", "updated_at") SELECT "id", "user_id", "nombre", "primer_apellido", "segundo_apellido", "tipo_documento", "numero_documento", "fecha_nacimiento", "genero", "telefono", "telefono_alternativo", "pais", "departamento", "ciudad", "direccion", "codigo_postal", "avatar_key", "avatar_url", "avatar_thumb_key", "avatar_thumb_url", "created_at", "updated_at" FROM `user_profiles`;--> statement-breakpoint
DROP TABLE `user_profiles`;--> statement-breakpoint
ALTER TABLE `__new_user_profiles` RENAME TO `user_profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
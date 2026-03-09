import { z } from 'zod'

/**
 * Convierte cadenas vacías a `undefined` antes de validar.
 * Necesario para campos de formularios HTML que envían '' en lugar de undefined.
 */
const emptyStr = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema)

// ─── Perfil completo (creación) ────────────────────────────────────────────────
const profileSchema = z.object({
  nombre:               z.string().min(1).max(100),
  primer_apellido:      z.string().min(1).max(100),
  segundo_apellido:     z.string().max(100).nullish(),
  tipo_documento:       z.enum(['dni', 'cedula', 'pasaporte', 'nie']),
  numero_documento:     z.string().min(1).max(50),
  fecha_nacimiento:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  genero:               z.enum(['masculino', 'femenino', 'otro', 'prefiero_no_decir']).optional(),
  telefono:             z.string().max(30).nullish(),
  telefono_alternativo: z.string().max(30).nullish(),
  pais:                 z.string().max(100).nullish(),
  departamento:         z.string().max(100).nullish(),
  ciudad:               z.string().max(100).nullish(),
  direccion:            z.string().max(255).nullish(),
  codigo_postal:        z.string().max(20).nullish(),
})

// ─── Perfil parcial (actualización) ───────────────────────────────────────────
// Los campos requeridos en creación son opcionales aquí,
// y los strings vacíos se convierten a undefined (ignorados en el PATCH).
const profileUpdateSchema = z.object({
  nombre:               emptyStr(z.string().min(1).max(100).optional()),
  primer_apellido:      emptyStr(z.string().min(1).max(100).optional()),
  segundo_apellido:     z.string().max(100).nullish(),
  tipo_documento:       z.enum(['dni', 'cedula', 'pasaporte', 'nie']).optional(),
  numero_documento:     emptyStr(z.string().min(1).max(50).optional()),
  fecha_nacimiento:     emptyStr(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  genero:               z.enum(['masculino', 'femenino', 'otro', 'prefiero_no_decir']).optional(),
  telefono:             z.string().max(30).nullish(),
  telefono_alternativo: z.string().max(30).nullish(),
  pais:                 z.string().max(100).nullish(),
  departamento:         z.string().max(100).nullish(),
  ciudad:               z.string().max(100).nullish(),
  direccion:            z.string().max(255).nullish(),
  codigo_postal:        z.string().max(20).nullish(),
})

// ─── Schemas exportados ────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  username:  z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  email:     z.string().email().max(255),
  password:  z.string().min(8).max(128),
  is_active: z.boolean().optional(),
  role_ids:  z.array(z.number().int().positive()).optional(),
  profile:   profileSchema.optional(),
})

export const updateUserSchema = z.object({
  username:              z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email:                 z.string().email().max(255).optional(),
  is_active:             z.boolean().optional(),
  password:              emptyStr(z.string().min(8).max(128).optional()),
  password_confirmation: emptyStr(z.string().optional()),
  role_ids:              z.array(z.number().int().positive()).optional(),
  profile:               profileUpdateSchema.optional(),
}).refine(
  data => !data.password || data.password === data.password_confirmation,
  { message: 'Las contraseñas no coinciden', path: ['password_confirmation'] },
)

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

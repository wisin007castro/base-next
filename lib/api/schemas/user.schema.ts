import { z } from 'zod'

/**
 * Convierte cadenas vacías a `undefined` antes de validar.
 * Necesario para campos de formularios HTML que envían '' en lugar de undefined.
 */
const emptyStr = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema)

/**
 * Convierte cadenas vacías o solo espacios a `null`.
 * Usado para apellidos: permite almacenar null en BD.
 */
const nullableStr = (inner: z.ZodString) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    inner.nullable().optional(),
  )

// ─── Perfil completo (creación) ────────────────────────────────────────────────
const profileSchema = z.object({
  nombre:               z.string().min(1).max(100),
  primer_apellido:      nullableStr(z.string().max(100)),
  segundo_apellido:     nullableStr(z.string().max(100)),
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
}).refine(
  data => !!(data.primer_apellido || data.segundo_apellido),
  { message: 'Se requiere al menos un apellido', path: ['primer_apellido'] },
)

// ─── Perfil parcial (actualización) ───────────────────────────────────────────
const profileUpdateSchema = z.object({
  nombre:               emptyStr(z.string().min(1).max(100).optional()),
  primer_apellido:      nullableStr(z.string().max(100)),
  segundo_apellido:     nullableStr(z.string().max(100)),
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
}).refine(
  data => {
    // Solo validar si al menos un apellido está presente en el payload
    if (data.primer_apellido === undefined && data.segundo_apellido === undefined) return true
    return !!(data.primer_apellido || data.segundo_apellido)
  },
  { message: 'Se requiere al menos un apellido', path: ['primer_apellido'] },
)

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

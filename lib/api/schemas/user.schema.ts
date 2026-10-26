import { z } from '@/lib/validation/zod-config'

/**
 * Convierte cadenas vacías a `undefined` antes de validar.
 * Necesario para campos de formularios HTML que envían '' en lugar de undefined.
 */
const emptyStr = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(v => (v === '' ? undefined : v), schema)

/**
 * Convierte cadenas vacías o solo espacios a `null`.
 * Usado para apellidos: permite almacenar null en BD.
 */
const nullableStr = (inner: z.ZodString) =>
  z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? null : v), inner.nullable().optional())

export const DOCUMENT_TYPES = ['dni', 'cedula', 'pasaporte', 'nie'] as const
export const GENDERS = ['masculino', 'femenino', 'otro', 'prefiero_no_decir'] as const

// ─── Perfil completo (creación) ────────────────────────────────────────────────
export const profileSchema = z
  .object({
    nombre: z.string().min(1).max(100),
    primer_apellido: nullableStr(z.string().max(100)),
    segundo_apellido: nullableStr(z.string().max(100)),
    tipo_documento: z.enum(DOCUMENT_TYPES),
    numero_documento: z.string().min(1).max(50),
    fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
    genero: z.enum(GENDERS).optional(),
    telefono: z.string().max(30).nullish(),
    telefono_alternativo: z.string().max(30).nullish(),
    pais: z.string().max(100).nullish(),
    departamento: z.string().max(100).nullish(),
    ciudad: z.string().max(100).nullish(),
    direccion: z.string().max(255).nullish(),
    codigo_postal: z.string().max(20).nullish(),
  })
  .refine(data => !!(data.primer_apellido || data.segundo_apellido), {
    message: 'Se requiere al menos un apellido',
    path: ['primer_apellido'],
  })

// ─── Perfil parcial (actualización) ───────────────────────────────────────────
const profileUpdateSchema = z
  .object({
    nombre: emptyStr(z.string().min(1).max(100).optional()),
    primer_apellido: nullableStr(z.string().max(100)),
    segundo_apellido: nullableStr(z.string().max(100)),
    tipo_documento: z.enum(DOCUMENT_TYPES).optional(),
    numero_documento: emptyStr(z.string().min(1).max(50).optional()),
    fecha_nacimiento: emptyStr(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
    genero: z.enum(GENDERS).optional(),
    telefono: z.string().max(30).nullish(),
    telefono_alternativo: z.string().max(30).nullish(),
    pais: z.string().max(100).nullish(),
    departamento: z.string().max(100).nullish(),
    ciudad: z.string().max(100).nullish(),
    direccion: z.string().max(255).nullish(),
    codigo_postal: z.string().max(20).nullish(),
  })
  .refine(
    data => {
      // Solo validar si al menos un apellido está presente en el payload
      if (data.primer_apellido === undefined && data.segundo_apellido === undefined) return true
      return !!(data.primer_apellido || data.segundo_apellido)
    },
    { message: 'Se requiere al menos un apellido', path: ['primer_apellido'] },
  )

// ─── Schemas exportados ────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  is_active: z.boolean().optional(),
  role_ids: z.array(z.number().int().positive()).optional(),
  profile: profileSchema.optional(),
})

const updateUserFields = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  email: z.string().email().max(255).optional(),
  is_active: z.boolean().optional(),
  password: emptyStr(z.string().min(8).max(128).optional()),
  password_confirmation: emptyStr(z.string().optional()),
  role_ids: z.array(z.number().int().positive()).optional(),
  profile: profileUpdateSchema.optional(),
})

const passwordsMatch = (data: { password?: string; password_confirmation?: string }) =>
  !data.password || data.password === data.password_confirmation
const passwordsMismatch = { message: 'Las contraseñas no coinciden', path: ['password_confirmation'] }

export const updateUserSchema = updateUserFields.refine(passwordsMatch, passwordsMismatch)

/** PATCH /api/me: el propio usuario no puede tocar `is_active` ni sus roles. */
export const updateMeSchema = updateUserFields
  .omit({ is_active: true, role_ids: true })
  .extend({ current_password: emptyStr(z.string().max(128).optional()) })
  .refine(passwordsMatch, passwordsMismatch)

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateMeInput = z.infer<typeof updateMeSchema>

// ─── 2FA (perfil propio) ───────────────────────────────────────────────────────
export const enableTwoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, 'El código tiene 6 dígitos'),
})

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Introduce tu contraseña actual'),
})

export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorSchema>
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>

// ─── Acciones en lote ──────────────────────────────────────────────────────────
export const BULK_USER_ACTIONS = ['activate', 'deactivate', 'delete', 'restore', 'force_delete'] as const

export const bulkUserActionSchema = z.object({
  action: z.enum(BULK_USER_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un usuario').max(100),
})

export type BulkUserAction = (typeof BULK_USER_ACTIONS)[number]
export type BulkUserActionInput = z.infer<typeof bulkUserActionSchema>

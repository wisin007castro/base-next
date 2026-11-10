import { z, DATE_RE } from '@/lib/validation/zod-config'

export const PRIVILEGE_EFFECTS = ['grant', 'deny'] as const
export type PrivilegeEffect = (typeof PRIVILEGE_EFFECTS)[number]

const today = () => new Date().toISOString().slice(0, 10)

/** POST /api/users/:id/permissions — crea o reemplaza el privilegio sobre un permiso */
export const privilegeSchema = z.object({
  permission_id: z.number().int().positive(),
  effect: z.enum(PRIVILEGE_EFFECTS),
  reason: z
    .string()
    .trim()
    .max(255)
    .nullish()
    .transform(v => v || null),
  /** Último día de vigencia (AAAA-MM-DD); vacío = sin caducidad */
  expires_on: z
    .union([z.string().regex(DATE_RE, 'Formato esperado: AAAA-MM-DD'), z.literal(''), z.null()])
    .optional()
    .transform(v => v || null)
    .refine(v => !v || v >= today(), 'La fecha no puede ser pasada'),
})

export type PrivilegeInput = z.input<typeof privilegeSchema>

/** El privilegio vale hasta el final del día indicado (UTC) */
export const expiresAtFromDate = (date: string | null) => (date ? `${date}T23:59:59.999Z` : null)

import { z } from '@/lib/validation/zod-config'

/**
 * Secciones de configuración. Cada una: esquema (lo que se guarda y devuelve la API) + valores
 * por defecto. Compartido por servidor y formularios.
 */

// ─── Sistema ─────────────────────────────────────────────────────────────────
export const systemSettingsSchema = z.object({
  systemName: z.string().trim().min(1).max(60),
  /** URL absoluta (los correos la necesitan); vacío = sin logo */
  logoUrl: z.union([z.url().max(500), z.literal('')]),
})
export type SystemSettings = z.infer<typeof systemSettingsSchema>
export const systemDefaults: SystemSettings = { systemName: 'Panel de administración', logoUrl: '' }

// ─── Acceso ──────────────────────────────────────────────────────────────────
export const TWO_FACTOR_POLICIES = ['off', 'admins', 'everyone'] as const
export type TwoFactorPolicy = (typeof TWO_FACTOR_POLICIES)[number]

export const accessSettingsSchema = z.object({
  /** Quién debe tener 2FA activo: nadie (opcional), los administradores o todos */
  twoFactorPolicy: z.enum(TWO_FACTOR_POLICIES),
  invitationDays: z.number().int().min(1).max(90),
  /** Inicio de sesión con código por correo (sin contraseña) */
  loginCodeEnabled: z.boolean(),
  loginCodeMinutes: z.number().int().min(1).max(60),
})
export type AccessSettings = z.infer<typeof accessSettingsSchema>
export const accessDefaults: AccessSettings = {
  twoFactorPolicy: 'off',
  invitationDays: 7,
  loginCodeEnabled: false,
  loginCodeMinutes: 10,
}

// ─── Correo ──────────────────────────────────────────────────────────────────
/** env: variables MAIL_* de .env · database: lo que se guarda aquí */
export const MAIL_SOURCES = ['env', 'database'] as const

export const mailSettingsSchema = z.object({
  source: z.enum(MAIL_SOURCES),
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(255),
  from: z.string().trim().max(255),
})
export type MailSettings = z.infer<typeof mailSettingsSchema> & {
  /** Contraseña cifrada (solo servidor; la API devuelve `hasPassword`) */
  passEncrypted?: string | null
}
export const mailDefaults: MailSettings = {
  source: 'env',
  host: '',
  port: 587,
  secure: false,
  user: '',
  from: '',
  passEncrypted: null,
}

/** PUT de correo: `pass` vacío = mantener la guardada; `clearPass` la borra */
export const mailSettingsInputSchema = mailSettingsSchema
  .extend({ pass: z.string().max(255).optional(), clearPass: z.boolean().optional() })
  .superRefine((d, ctx) => {
    if (d.source !== 'database') return
    if (!d.host) ctx.addIssue({ code: 'custom', path: ['host'], message: 'Este campo es obligatorio' })
    if (!d.from) ctx.addIssue({ code: 'custom', path: ['from'], message: 'Este campo es obligatorio' })
  })
export type MailSettingsInput = z.infer<typeof mailSettingsInputSchema>

/** Lo que devuelve GET /api/settings/mail (sin la contraseña) */
export type MailSettingsView = z.infer<typeof mailSettingsSchema> & { hasPassword: boolean }

export const SETTINGS = {
  system: { schema: systemSettingsSchema, defaults: systemDefaults },
  access: { schema: accessSettingsSchema, defaults: accessDefaults },
  mail: { schema: mailSettingsSchema, defaults: mailDefaults },
} as const
export type SettingsKey = keyof typeof SETTINGS
export type SettingsValue = { system: SystemSettings; access: AccessSettings; mail: MailSettings }

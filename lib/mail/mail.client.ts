import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '@/lib/env'
import { getSettings } from '@/lib/settings'
import { decryptSecret } from '@/lib/settings/secrets'

export interface MailConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

/** Config efectiva: la de /configuracion (si su origen es "database") o las variables MAIL_* */
export async function mailConfig(): Promise<MailConfig> {
  const s = await getSettings('mail')
  if (s.source === 'database') {
    return {
      host: s.host,
      port: s.port,
      secure: s.secure,
      user: s.user || undefined,
      pass: (s.passEncrypted && decryptSecret(s.passEncrypted)) || undefined,
      from: s.from,
    }
  }
  return {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
    from: env.MAIL_FROM,
  }
}

export const createTransport = (c: MailConfig) =>
  nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    // Credenciales solo si el SMTP las pide (MailDev no)
    auth: c.user ? { user: c.user, pass: c.pass } : undefined,
    ignoreTLS: !c.secure && !c.user, // MailDev no usa TLS
    tls: { rejectUnauthorized: env.NODE_ENV === 'production' },
  })

// Un transporte por configuración: se recrea solo si cambia (al guardar en /configuracion)
const g = globalThis as unknown as { _mailer?: { key: string; transporter: Transporter } }

export async function getMailer(): Promise<{ transporter: Transporter; from: string }> {
  const config = await mailConfig()
  const key = JSON.stringify(config)
  if (g._mailer?.key !== key) g._mailer = { key, transporter: createTransport(config) }
  return { transporter: g._mailer.transporter, from: config.from }
}

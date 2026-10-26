import nodemailer from 'nodemailer'
import { env } from '@/lib/env'

export const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  // Credenciales solo si el SMTP las pide (MailDev no)
  auth: env.MAIL_USER ? { user: env.MAIL_USER, pass: env.MAIL_PASS } : undefined,
  ignoreTLS: !env.MAIL_SECURE && !env.MAIL_USER, // MailDev no usa TLS
  tls: { rejectUnauthorized: env.NODE_ENV === 'production' },
})

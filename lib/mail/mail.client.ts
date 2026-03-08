import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST ?? '127.0.0.1', // IPv4 explícito evita que resuelva a ::1
  port:   Number(process.env.MAIL_PORT ?? 1025),
  secure: process.env.MAIL_SECURE === 'true',
  ignoreTLS: true,   // MailDev no usa TLS
  tls: { rejectUnauthorized: false },
})

// Verificar conexión al iniciar (muestra error en terminal de Next.js si MailDev no está activo)
transporter.verify().then(() => {
  console.log('[mail] Conectado a MailDev en %s:%s', process.env.MAIL_HOST ?? '127.0.0.1', process.env.MAIL_PORT ?? 1025)
}).catch((err) => {
  console.error('[mail] No se pudo conectar al servidor SMTP:', err.message)
})

import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST   ?? 'localhost',
  port:   Number(process.env.MAIL_PORT ?? 1025),
  secure: process.env.MAIL_SECURE === 'true',
  // Sin auth para MailDev; en producción agrega user/pass aquí
})

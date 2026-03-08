import { NextResponse } from 'next/server'
import { transporter } from '@/lib/mail/mail.client'

// GET /api/debug/mail — verifica la conexión SMTP y envía un correo de prueba
// ⚠️ Solo para desarrollo — eliminar en producción
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'No disponible en producción' }, { status: 403 })
  }

  try {
    await transporter.verify()
    await transporter.sendMail({
      from:    process.env.MAIL_FROM ?? 'noreply@localhost',
      to:      'test@ejemplo.com',
      subject: 'Test de conexión SMTP',
      html:    '<h1>Correo de prueba</h1><p>La conexión SMTP funciona correctamente.</p>',
    })
    return NextResponse.json({
      ok:   true,
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      msg:  'Correo enviado — revisá http://localhost:1080',
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({
      ok:    false,
      host:  process.env.MAIL_HOST,
      port:  process.env.MAIL_PORT,
      error: error.message,
    }, { status: 500 })
  }
}

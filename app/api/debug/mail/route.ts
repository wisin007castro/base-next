import { NextResponse } from 'next/server'
import { transporter } from '@/lib/mail/mail.client'
import { sendTestEmail } from '@/lib/mail/mail.service'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

// GET /api/debug/mail — verifica la conexión SMTP y envía un correo de prueba (plantilla react-email)
// Solo disponible en desarrollo y para administradores
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'No disponible en producción' }, { status: 403 })
  }

  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  try {
    await transporter.verify()
    await sendTestEmail('test@ejemplo.com')
    return NextResponse.json({ ok: true, msg: 'Correo enviado: revísalo en MailDev' })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

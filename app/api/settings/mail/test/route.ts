import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { z } from '@/lib/validation/zod-config'
import { mailConfig, createTransport } from '@/lib/mail/mail.client'
import { sendTestEmail } from '@/lib/mail/mail.service'
import { logger } from '@/lib/logger'

const bodySchema = z.object({ to: z.email() })

// POST /api/settings/mail/test { to } — comprueba la conexión SMTP de la config guardada y envía
// un correo de prueba. Devuelve el error del servidor SMTP para poder corregir la config.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  try {
    await createTransport(await mailConfig()).verify()
    await sendTestEmail(parsed.data.to)
    return NextResponse.json({ message: `Correo de prueba enviado a ${parsed.data.to}` })
  } catch (err) {
    logger.warn({ module: 'mail', err }, 'falló el correo de prueba')
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ message: `No se pudo enviar: ${message}` }, { status: 502 })
  }
}

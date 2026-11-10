import { NextRequest, NextResponse } from 'next/server'
import { z } from '@/lib/validation/zod-config'
import { requestLoginCode } from '@/lib/auth/login-code'
import { logger } from '@/lib/logger'

const bodySchema = z.object({ email: z.email() })

// POST /api/auth/login-code { email } — envía un código de acceso al correo (pública).
// Misma respuesta exista o no la cuenta.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const result = await requestLoginCode(parsed.data.email)
    if (result === 'disabled') {
      return NextResponse.json({ message: 'El inicio de sesión con código no está activado' }, { status: 404 })
    }
    if (result === 'rate_limited') {
      return NextResponse.json({ message: 'Demasiadas solicitudes. Espera unos minutos.' }, { status: 429 })
    }
  } catch (err) {
    logger.error({ module: 'auth', err }, 'no se pudo enviar el código de acceso')
    return NextResponse.json({ message: 'No se pudo enviar el correo. Intenta más tarde.' }, { status: 502 })
  }

  return NextResponse.json({ message: 'Si el correo está registrado, te enviamos un código.' })
}

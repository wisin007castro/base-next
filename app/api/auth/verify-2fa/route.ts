import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { verify } from 'otplib'
import { requireAuthPending, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// POST /api/auth/verify-2fa — verifica el código TOTP
// Permite sesiones con twoFactorPending=true
export async function POST(req: NextRequest) {
  const guard = await requireAuthPending()
  if (isGuardError(guard)) return guard

  const body = await req.json().catch(() => ({}))
  const { code } = body as { code?: string }

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ message: 'Código requerido' }, { status: 400 })
  }

  const userId = Number(guard.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ message: 'Usuario no encontrado o sin 2FA configurado' }, { status: 400 })
  }

  const isValid = await verify({ token: code, secret: user.twoFactorSecret })

  if (!isValid) {
    return NextResponse.json({ message: 'Código incorrecto' }, { status: 400 })
  }

  return NextResponse.json({ message: 'OK' })
}

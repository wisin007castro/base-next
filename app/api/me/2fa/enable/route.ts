import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { verify } from 'otplib'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// POST /api/me/2fa/enable — activa 2FA verificando el primer código
export async function POST(req: NextRequest) {
  const guard = await requireAuth()
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

  if (!user) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  }

  if (!user.twoFactorSecret) {
    return NextResponse.json({ message: '2FA no configurado. Llame a /api/me/2fa/setup primero.' }, { status: 400 })
  }

  const isValid = await verify({ token: code, secret: user.twoFactorSecret })

  if (!isValid) {
    return NextResponse.json({ message: 'Código incorrecto' }, { status: 400 })
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: true, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))

  return NextResponse.json({ message: '2FA activado' })
}

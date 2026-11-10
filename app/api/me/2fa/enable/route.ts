import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { enableTwoFactorSchema } from '@/lib/api/schemas/user.schema'
import { verifyTotp } from '@/lib/auth/two-factor'

// POST /api/me/2fa/enable — activa 2FA verificando el primer código
export async function POST(req: NextRequest) {
  const guard = await requireAuth({ allowTwoFactorSetup: true })
  if (isGuardError(guard)) return guard

  const parsed = enableTwoFactorSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
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

  const result = await verifyTotp(userId, parsed.data.code)
  if (result === 'rate_limited') {
    return NextResponse.json({ message: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  }
  if (result !== 'ok') {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: { code: ['Código incorrecto'] } } },
      { status: 422 },
    )
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: true, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))

  return NextResponse.json({ message: '2FA activado' })
}

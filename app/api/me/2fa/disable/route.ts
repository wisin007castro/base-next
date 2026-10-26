import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { disableTwoFactorSchema } from '@/lib/api/schemas/user.schema'

// POST /api/me/2fa/disable — desactiva 2FA verificando la contraseña actual
export async function POST(req: NextRequest) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const parsed = disableTwoFactorSchema.safeParse(await req.json().catch(() => null))
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

  const valid = await bcrypt.compare(parsed.data.password, user.password)
  if (!valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: { password: ['Contraseña incorrecta'] } } },
      { status: 422 },
    )
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))

  return NextResponse.json({ message: '2FA desactivado' })
}

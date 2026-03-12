import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// POST /api/me/2fa/disable — desactiva 2FA verificando la contraseña actual
export async function POST(req: NextRequest) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const body = await req.json().catch(() => ({}))
  const { password } = body as { password?: string }

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ message: 'Contraseña requerida' }, { status: 400 })
  }

  const userId = Number(guard.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ message: 'Contraseña incorrecta' }, { status: 400 })
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))

  return NextResponse.json({ message: '2FA desactivado' })
}

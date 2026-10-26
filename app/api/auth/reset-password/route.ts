import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyToken } from '@/lib/auth/tokens'

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'El token es obligatorio'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirmation: z.string().min(1, 'La confirmación es obligatoria'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { token, password } = parsed.data

  // Verificar la firma del token y que no haya expirado según HMAC
  const userId = verifyToken(token)
  if (!userId) {
    return NextResponse.json(
      { message: 'El enlace es inválido o ha expirado' },
      { status: 400 },
    )
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return NextResponse.json(
      { message: 'El enlace es inválido o ha expirado' },
      { status: 400 },
    )
  }

  // Verificar que el token almacenado coincide con el enviado
  if (user.passwordResetToken !== token) {
    return NextResponse.json(
      { message: 'El enlace es inválido o ha expirado' },
      { status: 400 },
    )
  }

  // Verificar que el token no haya expirado según la fecha almacenada
  if (!user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt) <= new Date()) {
    return NextResponse.json(
      { message: 'El enlace ha expirado. Solicita uno nuevo.' },
      { status: 400 },
    )
  }

  const hashed = await bcrypt.hash(password, 12)
  const now = new Date().toISOString()

  await db
    .update(users)
    .set({
      password: hashed,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(users.id, userId))

  return NextResponse.json({ message: 'Contraseña actualizada' }, { status: 200 })
}

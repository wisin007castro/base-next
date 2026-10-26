import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { generateVerificationToken } from '@/lib/auth/tokens'
import { sendPasswordResetEmail } from '@/lib/mail/mail.service'

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  // Siempre responder 200 para no revelar si el correo existe
  const ok = NextResponse.json(
    { message: 'Si el correo existe, recibirás un enlace' },
    { status: 200 },
  )

  if (!email) return ok

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!user) return ok

  // 1 hora en ms
  const ONE_HOUR_MS = 60 * 60 * 1000
  const token = generateVerificationToken(user.id, ONE_HOUR_MS)
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS).toISOString()

  await db
    .update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id))

  await sendPasswordResetEmail(user.email, user.username, token).catch(() => {
    // No exponer errores de correo al cliente
  })

  return ok
}

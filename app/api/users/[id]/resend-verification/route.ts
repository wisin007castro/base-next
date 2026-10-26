import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { generateVerificationToken } from '@/lib/auth/tokens'
import { sendVerificationLinkEmail } from '@/lib/mail/mail.service'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { logger } from '@/lib/logger'

// POST /api/users/:id/resend-verification
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const user = await db.query.users.findFirst({ where: eq(users.id, Number(id)) })

  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  if (user.emailVerifiedAt) return NextResponse.json({ message: 'El correo ya está verificado' }, { status: 400 })

  const verificationToken = generateVerificationToken(user.id)

  try {
    await sendVerificationLinkEmail(user.email, user.username, verificationToken)
    logger.info({ module: 'mail', userId: user.id }, 'enlace de verificación enviado')
    return NextResponse.json({ message: 'Correo de verificación enviado' })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ module: 'mail', userId: user.id, err: error }, 'no se pudo enviar el enlace de verificación')
    return NextResponse.json({ message: 'Error al enviar el correo' }, { status: 500 })
  }
}

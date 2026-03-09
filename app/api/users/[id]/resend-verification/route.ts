import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { generateVerificationToken } from '@/lib/auth/tokens'
import { sendVerificationLinkEmail } from '@/lib/mail/mail.service'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

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
    console.log('[mail] Enlace de verificación enviado a', user.email)
    return NextResponse.json({ message: 'Correo de verificación enviado' })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[mail] Error al enviar enlace de verificación:', error.message)
    return NextResponse.json({ message: 'Error al enviar el correo', detail: error.message }, { status: 500 })
  }
}

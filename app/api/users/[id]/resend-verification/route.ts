import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { generateVerificationToken } from '@/lib/auth/tokens'
import { sendVerificationLinkEmail } from '@/lib/mail/mail.service'

// POST /api/users/:id/resend-verification — admin envía email con enlace de verificación
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: 'No autenticado' }, { status: 401 })

  const token = session.user as { roles?: string[] }
  const isAdmin = token.roles?.includes('admin') ?? false
  if (!isAdmin) return NextResponse.json({ message: 'Sin permisos' }, { status: 403 })

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

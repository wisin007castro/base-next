import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { findInvitation, serializeInvitation } from '@/lib/api/serializers/invitation.serializer'
import { invitationExpiry, newInvitationToken } from '@/lib/auth/invitations'
import { sendInvitationEmail } from '@/lib/mail/mail.service'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

// POST /api/invitations/:id/resend — enlace nuevo (el anterior deja de valer) y plazo renovado
export async function POST(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const invitation = await findInvitation(id)
  if (!invitation) return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 404 })
  if (invitation.acceptedAt) return NextResponse.json({ message: 'La invitación ya fue aceptada' }, { status: 409 })

  const { token, tokenHash } = newInvitationToken()
  const expiresAt = invitationExpiry()
  await db
    .update(invitations)
    .set({ tokenHash, expiresAt, updatedAt: new Date().toISOString() })
    .where(eq(invitations.id, id))

  try {
    await sendInvitationEmail(invitation.email, {
      token,
      invitedBy: guard.user.name,
      roles: invitation.roles.map(r => r.role.name),
      expiresAt,
    })
  } catch (err) {
    logger.error({ module: 'invitations', err, invitationId: id }, 'no se pudo reenviar la invitación')
    return NextResponse.json({ message: 'No se pudo enviar el correo' }, { status: 502 })
  }

  return NextResponse.json(serializeInvitation((await findInvitation(id))!))
}

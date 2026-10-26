import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { findInvitation } from '@/lib/api/serializers/invitation.serializer'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/invitations/:id — revoca una invitación no aceptada (su enlace deja de valer)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const invitation = await findInvitation(id)
  if (!invitation) return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 404 })
  if (invitation.acceptedAt) {
    return NextResponse.json({ message: 'La invitación ya fue aceptada: gestiona el usuario' }, { status: 409 })
  }

  await db.delete(invitations).where(eq(invitations.id, id))
  return new NextResponse(null, { status: 204 })
}

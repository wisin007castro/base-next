import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'
import { invitationStatus } from '@/lib/auth/invitations'
import type { Invitation } from '@/lib/types/invitation.types'

const withRelations = {
  roles: { with: { role: true } },
  invitedBy: { columns: { id: true, username: true } },
} as const

type Row = NonNullable<Awaited<ReturnType<typeof findInvitation>>>

export const findInvitation = (id: number) =>
  db.query.invitations.findFirst({ where: eq(invitations.id, id), with: withRelations })

export const listInvitations = () =>
  db.query.invitations.findMany({ with: withRelations, orderBy: [desc(invitations.createdAt), desc(invitations.id)] })

export function serializeInvitation(r: Row): Invitation {
  return {
    id: r.id,
    email: r.email,
    status: invitationStatus(r),
    roles: r.roles.map(x => ({ id: x.role.id, label: x.role.name })),
    invited_by: r.invitedBy ? { id: r.invitedBy.id, label: r.invitedBy.username } : null,
    expires_at: r.expiresAt,
    accepted_at: r.acceptedAt,
    created_at: r.createdAt,
  }
}

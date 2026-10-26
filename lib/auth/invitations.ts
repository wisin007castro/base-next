import { createHash, randomBytes } from 'crypto'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'

/** Días que vale una invitación */
export const INVITATION_DAYS = 7

/** Token del enlace (256 bits). En la BD solo se guarda su hash. */
export function newInvitationToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashInvitationToken(token) }
}

export const hashInvitationToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const invitationExpiry = (days = INVITATION_DAYS) => new Date(Date.now() + days * 86_400_000).toISOString()

/** Invitación utilizable: existe, no aceptada y no caducada */
export async function findUsableInvitation(token: string) {
  return db.query.invitations.findFirst({
    where: and(
      eq(invitations.tokenHash, hashInvitationToken(token)),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date().toISOString()),
    ),
    with: { roles: { with: { role: true } } },
    orderBy: [desc(invitations.createdAt)],
  })
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export const invitationStatus = (i: { acceptedAt: string | null; expiresAt: string }): InvitationStatus =>
  i.acceptedAt ? 'accepted' : i.expiresAt <= new Date().toISOString() ? 'expired' : 'pending'

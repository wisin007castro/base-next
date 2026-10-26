import type { InvitationStatus } from '@/lib/auth/invitations'

export interface Invitation {
  id: number
  email: string
  status: InvitationStatus
  roles: { id: number; label: string }[]
  invited_by: { id: number; label: string } | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

/** Lo que ve la persona invitada al abrir el enlace (sin datos internos) */
export interface InvitationPreview {
  email: string
  roles: string[]
  expires_at: string
}

import type { AcceptInvitationInput, CreateInvitationInput } from '@/lib/api/schemas/invitation.schema'
import type { Invitation, InvitationPreview } from '@/lib/types/invitation.types'
import { request, toQueryString } from './http'

export const invitationsApi = {
  getAll: (signal?: AbortSignal) => request<Invitation[]>('/invitations', { signal }),
  create: (dto: CreateInvitationInput) =>
    request<Invitation>('/invitations', { method: 'POST', body: JSON.stringify(dto) }),
  resend: (id: number) => request<Invitation>(`/invitations/${id}/resend`, { method: 'POST' }),
  revoke: (id: number) => request<void>(`/invitations/${id}`, { method: 'DELETE' }),

  /** Públicas (página /invitacion) */
  preview: (token: string, signal?: AbortSignal) =>
    request<InvitationPreview>(`/invitations/accept${toQueryString({ token })}`, { signal }),
  accept: (dto: AcceptInvitationInput) =>
    request<{ email: string }>('/invitations/accept', { method: 'POST', body: JSON.stringify(dto) }),
}

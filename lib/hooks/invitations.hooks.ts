import { useMutation, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query'
import { invitationsApi } from '@/lib/api/invitations.api'
import { invitationKeys, userKeys } from '@/lib/constants/query-keys'
import type { CreateInvitationInput } from '@/lib/api/schemas/invitation.schema'

export const invitationQueries = {
  list: () =>
    queryOptions({
      queryKey: invitationKeys.lists(),
      queryFn: ({ signal }) => invitationsApi.getAll(signal),
    }),
  preview: (token: string) =>
    queryOptions({
      queryKey: invitationKeys.preview(token),
      queryFn: ({ signal }) => invitationsApi.preview(token, signal),
      enabled: !!token,
      retry: false,
    }),
}

export const useInvitations = () => useQuery(invitationQueries.list())
export const useInvitationPreview = (token: string) => useQuery(invitationQueries.preview(token))

function useInvalidateInvitations() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: invitationKeys.lists() })
}

export function useCreateInvitation() {
  const invalidate = useInvalidateInvitations()
  return useMutation({
    meta: { successToast: 'Invitación enviada' },
    mutationFn: (dto: CreateInvitationInput) => invitationsApi.create(dto),
    // También si falló solo el correo (502): la invitación existe y debe aparecer en la lista
    onSettled: invalidate,
  })
}

export function useResendInvitation() {
  const invalidate = useInvalidateInvitations()
  return useMutation({
    meta: { successToast: 'Invitación reenviada', errorToast: true },
    mutationFn: (id: number) => invitationsApi.resend(id),
    onSuccess: invalidate,
  })
}

export function useRevokeInvitation() {
  const invalidate = useInvalidateInvitations()
  return useMutation({
    meta: { successToast: 'Invitación revocada' },
    mutationFn: (id: number) => invitationsApi.revoke(id),
    onSuccess: invalidate,
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: invitationsApi.accept,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

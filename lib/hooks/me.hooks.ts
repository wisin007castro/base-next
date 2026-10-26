import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { meApi, type ActiveSession, type MeUser } from '@/lib/api/me.api'
import { meKeys } from '@/lib/constants/query-keys'

export const meQueries = {
  detail: () =>
    queryOptions({
      queryKey: meKeys.detail(),
      queryFn: ({ signal }) => meApi.get(signal),
    }),

  sessions: () =>
    queryOptions({
      queryKey: meKeys.sessions(),
      queryFn: ({ signal }) => meApi.getSessions(signal),
    }),
}

/**
 * Usuario autenticado. Header y Perfil comparten esta caché:
 * una sola petición, y cualquier cambio (avatar, nombre) se refleja en ambos.
 */
export function useMe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...meQueries.detail(), enabled })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => meApi.update(body),
    onSuccess: user => qc.setQueryData(meKeys.detail(), user),
  })
}

/** Aplica un cambio local a la caché de `me` (p. ej. tras subir el avatar) */
export function useSetMe() {
  const qc = useQueryClient()
  return (updater: (user: MeUser) => MeUser) =>
    qc.setQueryData<MeUser>(meKeys.detail(), old => (old ? updater(old) : old))
}

export function useInvalidateMe() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: meKeys.detail(), exact: true })
}

// ─── 2FA ──────────────────────────────────────────────────────────────────────

/** Genera el secreto + QR. Los datos viven en `mutation.data` hasta activar o cancelar (`reset()`). */
export const useSetupTwoFactor = () => useMutation({ mutationFn: meApi.setupTwoFactor })

/** Activar/desactivar marcan `twoFactorEnabled` en la caché de `me`: la sección cambia sin refetch */
function useToggleTwoFactor<T>(mutationFn: (dto: T) => Promise<void>, enabled: boolean) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      qc.setQueryData<MeUser>(meKeys.detail(), old => (old ? { ...old, twoFactorEnabled: enabled } : old)),
  })
}

export const useEnableTwoFactor = () => useToggleTwoFactor(meApi.enableTwoFactor, true)
export const useDisableTwoFactor = () => useToggleTwoFactor(meApi.disableTwoFactor, false)

export function useMySessions() {
  return useQuery(meQueries.sessions())
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => meApi.revokeSession(id),
    onSuccess: (_, id) => {
      qc.setQueryData<ActiveSession[]>(meKeys.sessions(), old => old?.filter(s => s.id !== id))
    },
  })
}

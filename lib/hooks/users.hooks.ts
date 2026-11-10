import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users.api'
import { userKeys } from '@/lib/constants/query-keys'
import type { CreateUserDto, UpdateUserDto, User, UserFilters } from '@/lib/types/user.types'
import type { PrivilegeInput } from '@/lib/api/schemas/privilege.schema'
import type { BulkUserAction } from '@/lib/api/schemas/user.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

const t = crudToasts('Usuario')

// -------------------------------------------------------------------
// Query options — una sola definición para useQuery, prefetchQuery,
// ensureQueryData, etc.
// -------------------------------------------------------------------
export const userQueries = {
  list: (filters: UserFilters) =>
    queryOptions({
      queryKey: userKeys.list(filters),
      queryFn: ({ signal }) => usersApi.getAll(filters, signal),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: userKeys.detail(id),
      queryFn: ({ signal }) => usersApi.getById(id, signal),
      enabled: !!id,
    }),

  privileges: (id: number) =>
    queryOptions({
      queryKey: userKeys.permissions(id),
      queryFn: ({ signal }) => usersApi.getPrivileges(id, signal),
      enabled: !!id,
    }),
}

// -------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------
export function useUsers(filters: UserFilters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    ...userQueries.list(filters),
    // Mantiene la página anterior visible mientras llega la nueva (sin parpadeo)
    placeholderData: keepPreviousData,
  })

  // Prefetch de la página siguiente para que "Siguiente" sea instantáneo
  const page = filters.page ?? 1
  const lastPage = query.data?.last_page
  useEffect(() => {
    if (query.isPlaceholderData || !lastPage || page >= lastPage) return
    qc.prefetchQuery(userQueries.list({ ...filters, page: page + 1 }))
  }, [qc, filters, page, lastPage, query.isPlaceholderData])

  return query
}

export function useUser(id: number) {
  return useQuery(userQueries.detail(id))
}

/** Precarga el detalle de un usuario (p. ej. al pasar el mouse por "Editar") */
export function usePrefetchUser() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(userQueries.detail(id))
}

// -------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------

/**
 * Guarda la respuesta del servidor en el detalle y marca los listados como obsoletos.
 * Solo para endpoints que devuelven el usuario completo (profile + roles).
 */
function useSyncUser() {
  const qc = useQueryClient()
  return (user: User) => {
    qc.setQueryData(userKeys.detail(user.id), user)
    qc.invalidateQueries({ queryKey: userKeys.lists() })
  }
}

/** Para endpoints que devuelven el usuario sin roles: refrescar en vez de sobrescribir */
function useInvalidateUser() {
  const qc = useQueryClient()
  return (_: unknown, id: number) => {
    qc.invalidateQueries({ queryKey: userKeys.detail(id) })
    qc.invalidateQueries({ queryKey: userKeys.lists() })
  }
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.created },
    mutationFn: (dto: CreateUserDto) => usersApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

export function useUpdateUser(id: number) {
  const sync = useSyncUser()
  return useMutation({
    meta: { successToast: t.updated },
    mutationFn: (dto: UpdateUserDto) => usersApi.update(id, dto),
    onSuccess: sync,
  })
}

export function useRemoveUser() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: userKeys.detail(id) })
      qc.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useRestoreUser() {
  const invalidate = useInvalidateUser()
  return useMutation({
    meta: { successToast: t.restored, errorToast: true },
    mutationFn: (id: number) => usersApi.restore(id),
    onSuccess: invalidate,
  })
}

export function useForceDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.forceDeleted, errorToast: true },
    mutationFn: (id: number) => usersApi.forceDelete(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: userKeys.detail(id) })
      qc.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useToggleActive() {
  const invalidate = useInvalidateUser()
  return useMutation({
    meta: { successToast: 'Estado actualizado', errorToast: true },
    mutationFn: (id: number) => usersApi.toggleActive(id),
    onSuccess: invalidate,
  })
}

export function useResendVerification() {
  return useMutation({
    meta: { successToast: 'Correo de verificación reenviado', errorToast: true },
    mutationFn: (id: number) => usersApi.resendVerification(id),
  })
}

export function useVerifyUser() {
  const sync = useSyncUser()
  return useMutation({
    meta: { successToast: 'Correo marcado como verificado', errorToast: true },
    mutationFn: (id: number) => usersApi.verify(id),
    onSuccess: sync,
  })
}

/** Activar / desactivar / eliminar / restaurar varios usuarios */
export function useBulkUserAction() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: bulkToast },
    mutationFn: ({ action, ids }: { action: BulkUserAction; ids: number[] }) => usersApi.bulk(action, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() })
      qc.invalidateQueries({ queryKey: userKeys.details() })
    },
  })
}

// -------------------------------------------------------------------
// Privilegios del usuario (conceder / denegar un permiso, con motivo y caducidad)
// -------------------------------------------------------------------
export function useUserPrivileges(userId: number) {
  return useQuery(userQueries.privileges(userId))
}

export function useSetPrivilege(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: 'Privilegio guardado' },
    mutationFn: (dto: PrivilegeInput) => usersApi.setPrivilege(userId, dto),
    // La respuesta ya trae la lista y los permisos efectivos recalculados
    onSuccess: data => qc.setQueryData(userKeys.permissions(userId), data),
  })
}

export function useRemovePrivilege(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: 'Privilegio quitado', errorToast: true },
    mutationFn: (permissionId: number) => usersApi.removePrivilege(userId, permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.permissions(userId) }),
  })
}

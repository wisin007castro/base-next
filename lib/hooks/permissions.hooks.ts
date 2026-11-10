import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { permissionsApi, type UpdatePermissionDto } from '@/lib/api/permissions.api'
import { permissionKeys } from '@/lib/constants/query-keys'
import type { CreatePermissionDto } from '@/lib/types/rbac.types'
import { crudToasts } from '@/lib/toast'

const t = crudToasts('Permiso')

export const permissionQueries = {
  list: () =>
    queryOptions({
      queryKey: permissionKeys.lists(),
      queryFn: ({ signal }) => permissionsApi.getAll(signal),
      staleTime: 5 * 60 * 1000,
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: permissionKeys.detail(id),
      queryFn: ({ signal }) => permissionsApi.getById(id, signal),
      enabled: !!id,
    }),
}

export function usePermissions() {
  return useQuery(permissionQueries.list())
}

export function usePermission(id: number) {
  return useQuery(permissionQueries.detail(id))
}

/** Precarga el detalle de un permiso (p. ej. al pasar el mouse por "Editar") */
export function usePrefetchPermission() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(permissionQueries.detail(id))
}

export function useCreatePermission() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.created },
    mutationFn: (dto: CreatePermissionDto) => permissionsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.lists() }),
  })
}

export function useUpdatePermission(id: number) {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.updated },
    mutationFn: (dto: UpdatePermissionDto) => permissionsApi.update(id, dto),
    onSuccess: permission => {
      qc.setQueryData(permissionKeys.detail(id), permission)
      qc.invalidateQueries({ queryKey: permissionKeys.lists() })
    },
  })
}

export function useDeletePermission() {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => permissionsApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: permissionKeys.detail(id) })
      qc.invalidateQueries({ queryKey: permissionKeys.lists() })
    },
  })
}

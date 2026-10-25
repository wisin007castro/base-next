import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { rolesApi } from '@/lib/api/roles.api'
import { roleKeys } from '@/lib/constants/query-keys'
import type { CreateRoleDto, UpdateRoleDto } from '@/lib/types/rbac.types'

export const roleQueries = {
  list: () =>
    queryOptions({
      queryKey: roleKeys.lists(),
      queryFn: ({ signal }) => rolesApi.getAll(signal),
      staleTime: 5 * 60 * 1000, // 5 min — roles cambian poco
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: roleKeys.detail(id),
      queryFn: ({ signal }) => rolesApi.getById(id, signal),
      enabled: !!id,
    }),
}

export function useRoles() {
  return useQuery(roleQueries.list())
}

export function useRole(id: number) {
  return useQuery(roleQueries.detail(id))
}

/** Precarga el detalle de un rol (p. ej. al pasar el mouse por "Editar") */
export function usePrefetchRole() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(roleQueries.detail(id))
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateRoleDto) => rolesApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.lists() }),
  })
}

export function useUpdateRole(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateRoleDto) => rolesApi.update(id, dto),
    onSuccess: role => {
      qc.setQueryData(roleKeys.detail(id), role)
      qc.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rolesApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: roleKeys.detail(id) })
      qc.invalidateQueries({ queryKey: roleKeys.lists() })
    },
  })
}

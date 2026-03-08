import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '@/lib/api/roles.api'
import { roleKeys } from '@/lib/constants/query-keys'
import type { CreateRoleDto, UpdateRoleDto } from '@/lib/types/rbac.types'

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 min — roles cambian poco
  })
}

export function useRole(id: number) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.getById(id),
    enabled: !!id,
  })
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() })
      qc.invalidateQueries({ queryKey: roleKeys.detail(id) })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rolesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.lists() }),
  })
}

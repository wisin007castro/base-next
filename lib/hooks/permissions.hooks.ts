import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissionsApi, type UpdatePermissionDto } from '@/lib/api/permissions.api'
import { permissionKeys } from '@/lib/constants/query-keys'
import type { CreatePermissionDto } from '@/lib/types/rbac.types'

export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.lists(),
    queryFn: () => permissionsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePermission(id: number) {
  return useQuery({
    queryKey: permissionKeys.detail(id),
    queryFn: () => permissionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePermissionDto) => permissionsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.lists() }),
  })
}

export function useUpdatePermission(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdatePermissionDto) => permissionsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: permissionKeys.lists() })
      qc.invalidateQueries({ queryKey: permissionKeys.detail(id) })
    },
  })
}

export function useDeletePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => permissionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.lists() }),
  })
}

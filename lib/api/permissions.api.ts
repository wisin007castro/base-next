import type { Permission, CreatePermissionDto } from '@/lib/types/rbac.types'
import { request } from './http'

export type UpdatePermissionDto = Partial<CreatePermissionDto>

export const permissionsApi = {
  getAll: (signal?: AbortSignal) => request<Permission[]>('/permissions', { signal }),
  getById: (id: number, signal?: AbortSignal) => request<Permission>(`/permissions/${id}`, { signal }),
  create: (dto: CreatePermissionDto) =>
    request<Permission>('/permissions', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdatePermissionDto) =>
    request<Permission>(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: number) => request<void>(`/permissions/${id}`, { method: 'DELETE' }),
}

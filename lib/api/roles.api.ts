import type { Role, CreateRoleDto, UpdateRoleDto } from '@/lib/types/rbac.types'
import { request } from './http'

export const rolesApi = {
  getAll: (signal?: AbortSignal) => request<Role[]>('/roles', { signal }),
  getById: (id: number, signal?: AbortSignal) => request<Role>(`/roles/${id}`, { signal }),
  create: (dto: CreateRoleDto) => request<Role>('/roles', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdateRoleDto) =>
    request<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: number) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
}

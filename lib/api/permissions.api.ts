import type { Permission, CreatePermissionDto } from '@/lib/types/rbac.types'

export type UpdatePermissionDto = Partial<CreatePermissionDto>

const API_BASE = '/api'

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Error en la petición')
  }
  return res.json() as Promise<T>
}

export const permissionsApi = {
  getAll: () => request<Permission[]>('/permissions'),
  getById: (id: number) => request<Permission>(`/permissions/${id}`),
  create: (dto: CreatePermissionDto) => request<Permission>('/permissions', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdatePermissionDto) => request<Permission>(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: number) => request<void>(`/permissions/${id}`, { method: 'DELETE' }),
}

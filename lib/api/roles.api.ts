import type { Role, CreateRoleDto, UpdateRoleDto } from '@/lib/types/rbac.types'

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

export const rolesApi = {
  getAll: () => request<Role[]>('/roles'),
  getById: (id: number) => request<Role>(`/roles/${id}`),
  create: (dto: CreateRoleDto) => request<Role>('/roles', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdateRoleDto) => request<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: number) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
}

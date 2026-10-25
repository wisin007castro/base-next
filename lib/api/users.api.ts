import type { User, CreateUserDto, UpdateUserDto, PaginatedResponse, UserFilters } from '@/lib/types/user.types'
import type { Permission } from '@/lib/types/rbac.types'
import { request } from './http'

export { ApiError } from './http'

function buildQuery(filters: UserFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v))
    }
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// -------------------------------------------------------------------
// Endpoints
// -------------------------------------------------------------------
export const usersApi = {
  /** Listado paginado */
  getAll: (filters: UserFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<User>>(`/users${buildQuery(filters)}`, { signal }),

  /** Usuario por ID (incluye profile) */
  getById: (id: number, signal?: AbortSignal) => request<User>(`/users/${id}`, { signal }),

  /** Crear usuario con perfil */
  create: (dto: CreateUserDto) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  /** Actualizar usuario (PATCH parcial) */
  update: (id: number, dto: UpdateUserDto) =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  /** Soft delete */
  remove: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  /** Restaurar usuario soft-deleted */
  restore: (id: number) => request<User>(`/users/${id}/restore`, { method: 'POST' }),

  /** Forzar eliminación permanente */
  forceDelete: (id: number) => request<void>(`/users/${id}/force`, { method: 'DELETE' }),

  /** Reenviar email de verificación */
  resendVerification: (id: number) => request<void>(`/users/${id}/resend-verification`, { method: 'POST' }),

  /** Activar / desactivar usuario */
  toggleActive: (id: number) => request<User>(`/users/${id}/toggle-active`, { method: 'POST' }),

  /** Verificar correo manualmente (sin envío de email) */
  verify: (id: number) => request<User>(`/users/${id}/verify`, { method: 'POST' }),

  /** Lista los permisos directos del usuario */
  getDirectPermissions: (id: number, signal?: AbortSignal) =>
    request<Permission[]>(`/users/${id}/permissions`, { signal }),

  /** Asigna un permiso directo al usuario */
  givePermission: (id: number, permissionId: number) =>
    request<void>(`/users/${id}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission_id: permissionId }),
    }),

  /** Revoca un permiso directo del usuario */
  revokePermission: (id: number, permissionId: number) =>
    request<void>(`/users/${id}/permissions/${permissionId}`, { method: 'DELETE' }),
}

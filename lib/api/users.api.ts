import type { User, CreateUserDto, UpdateUserDto, PaginatedResponse, UserFilters } from '@/lib/types/user.types'
import type { UserPrivileges } from '@/lib/types/rbac.types'
import type { PrivilegeInput } from '@/lib/api/schemas/privilege.schema'
import type { BulkUserAction } from '@/lib/api/schemas/user.schema'
import { request, toQueryString } from './http'

export { ApiError } from './http'

// -------------------------------------------------------------------
// Endpoints
// -------------------------------------------------------------------
export const usersApi = {
  /** Listado paginado */
  getAll: (filters: UserFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<User>>(`/users${toQueryString(filters)}`, { signal }),

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

  /** Privilegios del usuario (conceder/denegar) y sus permisos efectivos */
  getPrivileges: (id: number, signal?: AbortSignal) => request<UserPrivileges>(`/users/${id}/permissions`, { signal }),

  /** Concede o deniega un permiso (reemplaza el privilegio previo sobre ese permiso) */
  setPrivilege: (id: number, dto: PrivilegeInput) =>
    request<UserPrivileges>(`/users/${id}/permissions`, { method: 'POST', body: JSON.stringify(dto) }),

  /** Aplica una acción a varios usuarios a la vez */
  bulk: (action: BulkUserAction, ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),

  /** Quita el privilegio (vuelve a valer lo que den sus roles) */
  removePrivilege: (id: number, permissionId: number) =>
    request<void>(`/users/${id}/permissions/${permissionId}`, { method: 'DELETE' }),
}

import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  PaginatedResponse,
  UserFilters,
} from '@/lib/types/user.types'

// API interna de Next.js — misma app, misma URL
const API_BASE = '/api'

// -------------------------------------------------------------------
// Helper
// -------------------------------------------------------------------
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
  getAll: (filters: UserFilters = {}) =>
    request<PaginatedResponse<User>>(`/users${buildQuery(filters)}`),

  /** Usuario por ID (incluye profile) */
  getById: (id: number) =>
    request<User>(`/users/${id}`),

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
  remove: (id: number) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  /** Restaurar usuario soft-deleted */
  restore: (id: number) =>
    request<User>(`/users/${id}/restore`, { method: 'POST' }),

  /** Forzar eliminación permanente */
  forceDelete: (id: number) =>
    request<void>(`/users/${id}/force`, { method: 'DELETE' }),

  /** Reenviar email de verificación */
  resendVerification: (id: number) =>
    request<void>(`/users/${id}/resend-verification`, { method: 'POST' }),

  /** Activar / desactivar usuario */
  toggleActive: (id: number) =>
    request<User>(`/users/${id}/toggle-active`, { method: 'POST' }),
}

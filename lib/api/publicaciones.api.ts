import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { Publicacion, PublicacionFilters } from '@/lib/types/publicacion.types'
import type {
  BulkPublicacionAction,
  CreatePublicacionInput,
  UpdatePublicacionInput,
} from '@/lib/api/schemas/publicacion.schema'

export const publicacionesApi = {
  getAll: (filters: PublicacionFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<Publicacion>>(`/publicaciones${toQueryString(filters)}`, { signal }),

  getById: (id: number, signal?: AbortSignal) => request<Publicacion>(`/publicaciones/${id}`, { signal }),

  /** [{ value, label }] para selects (p. ej. el campo ref de otro módulo) */
  getOptions: (signal?: AbortSignal) =>
    request<{ value: number; label: string }[]>('/publicaciones/options', { signal }),

  create: (dto: CreatePublicacionInput) =>
    request<Publicacion>('/publicaciones', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: UpdatePublicacionInput) =>
    request<Publicacion>(`/publicaciones/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  remove: (id: number) => request<void>(`/publicaciones/${id}`, { method: 'DELETE' }),

  restore: (id: number) => request<Publicacion>(`/publicaciones/${id}/restore`, { method: 'POST' }),

  forceDelete: (id: number) => request<void>(`/publicaciones/${id}/force`, { method: 'DELETE' }),

  bulk: (action: BulkPublicacionAction, ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/publicaciones/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),
}

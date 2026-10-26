import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { Etiqueta, EtiquetaFilters } from '@/lib/types/etiqueta.types'
import type { BulkEtiquetaAction, CreateEtiquetaInput, UpdateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'

export const etiquetasApi = {
  getAll: (filters: EtiquetaFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<Etiqueta>>(`/etiquetas${toQueryString(filters)}`, { signal }),

  getById: (id: number, signal?: AbortSignal) => request<Etiqueta>(`/etiquetas/${id}`, { signal }),

  /** [{ value, label }] para selects (p. ej. el campo ref de otro módulo) */
  getOptions: (signal?: AbortSignal) => request<{ value: number; label: string }[]>('/etiquetas/options', { signal }),

  create: (dto: CreateEtiquetaInput) => request<Etiqueta>('/etiquetas', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: UpdateEtiquetaInput) =>
    request<Etiqueta>(`/etiquetas/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  remove: (id: number) => request<void>(`/etiquetas/${id}`, { method: 'DELETE' }),

  bulk: (action: BulkEtiquetaAction, ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/etiquetas/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),
}

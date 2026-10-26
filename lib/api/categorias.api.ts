import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { Categoria, CategoriaFilters } from '@/lib/types/categoria.types'
import type { CreateCategoriaInput, UpdateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

export const categoriasApi = {
  getAll: (filters: CategoriaFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<Categoria>>(`/categorias${toQueryString(filters)}`, { signal }),

  getById: (id: number, signal?: AbortSignal) => request<Categoria>(`/categorias/${id}`, { signal }),

  /** [{ value, label }] para selects (p. ej. el campo ref de otro módulo) */
  getOptions: (signal?: AbortSignal) => request<{ value: number; label: string }[]>('/categorias/options', { signal }),

  create: (dto: CreateCategoriaInput) =>
    request<Categoria>('/categorias', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: UpdateCategoriaInput) =>
    request<Categoria>(`/categorias/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  remove: (id: number) => request<void>(`/categorias/${id}`, { method: 'DELETE' }),

  bulkDelete: (ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/categorias/bulk', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', ids }),
    }),
}

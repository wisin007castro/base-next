import { z } from '@/lib/validation/zod-config'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'
import type { CategoriaFilters } from '@/lib/types/categoria.types'

/** Filtros del listado tal como viven en la URL (`/categorias?search=…&page=2`) */
export const categoriasSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z.coerce
    .number()
    .refine(n => PER_PAGE_OPTIONS.includes(n))
    .catch(PER_PAGE_OPTIONS[1]),
  sort: z.string().catch('-created_at'),
  search: z.string().catch(''),

  with_trashed: z.enum(['true']).optional().catch(undefined),
})

export type CategoriasSearch = z.output<typeof categoriasSearchSchema>

export const toCategoriaFilters = (s: CategoriasSearch): CategoriaFilters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,

  with_trashed: s.with_trashed === 'true' || undefined,
})

export const hasAnyFilter = (s: CategoriasSearch) => !!(s.search || s.with_trashed)

import { z } from '@/lib/validation/zod-config'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'
import type { PublicacionFilters } from '@/lib/types/publicacion.types'

/** Filtros del listado tal como viven en la URL (`/publicaciones?search=…&page=2`) */
export const publicacionesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z.coerce
    .number()
    .refine(n => PER_PAGE_OPTIONS.includes(n))
    .catch(PER_PAGE_OPTIONS[1]),
  sort: z.string().catch('-created_at'),
  search: z.string().catch(''),
  categoria_id: z.coerce.number().int().positive().optional().catch(undefined),
  publicada: z.enum(['true', 'false']).optional().catch(undefined),
})

export type PublicacionesSearch = z.output<typeof publicacionesSearchSchema>

export const toPublicacionFilters = (s: PublicacionesSearch): PublicacionFilters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,
  categoria_id: s.categoria_id,
  publicada: s.publicada,
})

export const hasAnyFilter = (s: PublicacionesSearch) => !!(s.search || s.categoria_id || s.publicada)

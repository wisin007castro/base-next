import { z } from '@/lib/validation/zod-config'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'
import type { EtiquetaFilters } from '@/lib/types/etiqueta.types'

/** Filtros del listado tal como viven en la URL (`/etiquetas?search=…&page=2`) */
export const etiquetasSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z.coerce
    .number()
    .refine(n => PER_PAGE_OPTIONS.includes(n))
    .catch(PER_PAGE_OPTIONS[1]),
  sort: z.string().catch('-created_at'),
  search: z.string().catch(''),
})

export type EtiquetasSearch = z.output<typeof etiquetasSearchSchema>

export const toEtiquetaFilters = (s: EtiquetasSearch): EtiquetaFilters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,
})

export const hasAnyFilter = (s: EtiquetasSearch) => !!s.search

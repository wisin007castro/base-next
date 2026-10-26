import { z } from '@/lib/validation/zod-config'
import type { BlogFilters } from '@/lib/types/blog.types'

/** Filtros del blog en la URL: `/blog?categoria_id=2&orden=populares&search=…` */
export const blogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().catch(''),
  categoria_id: z.coerce.number().int().positive().optional().catch(undefined),
  orden: z.enum(['recientes', 'populares']).catch('recientes'),
})

export type BlogSearch = z.output<typeof blogSearchSchema>

export const toBlogFilters = (s: BlogSearch): BlogFilters => ({
  page: s.page,
  per_page: 9,
  search: s.search || undefined,
  categoria_id: s.categoria_id,
  orden: s.orden,
})

import { z } from '@/lib/validation/zod-config'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'
import type { UserFilters } from '@/lib/types/user.types'

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

/** Filtros del listado de usuarios tal como viven en la URL (`/usuarios?search=…&page=2`) */
export const usersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z.coerce
    .number()
    .refine(n => PER_PAGE_OPTIONS.includes(n))
    .catch(PER_PAGE_OPTIONS[0]),
  sort: z.string().catch('-created_at'),
  search: z.string().catch(''),
  role: z.string().catch(''),
  is_active: z.enum(['true', 'false']).optional().catch(undefined),
  with_trashed: z.enum(['true']).optional().catch(undefined),
  created_from: date,
  created_to: date,
  login_from: date,
  login_to: date,
})

export type UsersSearch = z.output<typeof usersSearchSchema>

/** Estado de la URL → filtros que entiende la API */
export const toUserFilters = (s: UsersSearch): UserFilters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,
  role: s.role || undefined,
  is_active: s.is_active === undefined ? undefined : s.is_active === 'true',
  with_trashed: s.with_trashed === 'true' || undefined,
  created_from: s.created_from,
  created_to: s.created_to,
  login_from: s.login_from,
  login_to: s.login_to,
})

export const hasDateFilters = (s: UsersSearch) => !!(s.created_from || s.created_to || s.login_from || s.login_to)

export const hasAnyFilter = (s: UsersSearch) =>
  !!(s.search || s.role || s.is_active || s.with_trashed) || hasDateFilters(s)

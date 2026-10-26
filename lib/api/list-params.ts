import { asc, desc, type AnyColumn, type SQL } from 'drizzle-orm'

const toInt = (raw: string | null, fallback: number, max = Infinity) => {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback
}

/** `?page=&per_page=` validados (per_page ≤ 100) */
export function parsePagination(searchParams: URLSearchParams, defaultPerPage = 15) {
  const page = toInt(searchParams.get('page'), 1)
  const perPage = toInt(searchParams.get('per_page'), defaultPerPage, 100)
  return { page, perPage, offset: (page - 1) * perPage }
}

/**
 * `?sort=campo` (asc) / `?sort=-campo` (desc) contra una lista blanca de columnas.
 * Un campo desconocido cae en `fallback`.
 */
export function parseSort<K extends string>(raw: string | null, sortable: Record<K, AnyColumn>, fallback: SQL): SQL {
  if (!raw) return fallback
  const key = raw.replace(/^-/, '') as K
  const column = sortable[key]
  if (!column) return fallback
  return raw.startsWith('-') ? desc(column) : asc(column)
}

/** Respuesta paginada con la misma forma que `PaginatedResponse<T>` */
export function paginated<T>(data: T[], total: number, { page, perPage, offset }: ReturnType<typeof parsePagination>) {
  return {
    data,
    current_page: page,
    per_page: perPage,
    total,
    last_page: Math.ceil(total / perPage),
    from: total === 0 ? 0 : offset + 1,
    to: Math.min(offset + perPage, total),
    links: { first: null, last: null, prev: null, next: null },
  }
}

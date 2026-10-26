import type { QueryClient } from '@tanstack/react-query'
import { QUERY_DEPENDENCIES } from '@/lib/constants/query-dependencies'

/** Invalida listas y detalles de los módulos que muestran datos de `source` (ver QUERY_DEPENDENCIES) */
export function invalidateDependents(qc: QueryClient, source: string) {
  for (const [from, dependent] of QUERY_DEPENDENCIES) {
    if (from !== source) continue
    qc.invalidateQueries({ queryKey: [dependent, 'list'] })
    qc.invalidateQueries({ queryKey: [dependent, 'detail'] })
  }
}

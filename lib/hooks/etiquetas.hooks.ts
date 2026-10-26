import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { etiquetasApi } from '@/lib/api/etiquetas.api'
import { etiquetaKeys } from '@/lib/constants/query-keys'
import { invalidateDependents } from '@/lib/hooks/invalidate-dependents'
import type { EtiquetaFilters } from '@/lib/types/etiqueta.types'
import type { BulkEtiquetaAction, CreateEtiquetaInput, UpdateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

const t = crudToasts('Etiqueta', true)

export const etiquetaQueries = {
  list: (filters: EtiquetaFilters) =>
    queryOptions({
      queryKey: etiquetaKeys.list(filters),
      queryFn: ({ signal }) => etiquetasApi.getAll(filters, signal),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: etiquetaKeys.detail(id),
      queryFn: ({ signal }) => etiquetasApi.getById(id, signal),
      enabled: !!id,
    }),

  options: () =>
    queryOptions({
      queryKey: etiquetaKeys.options(),
      queryFn: ({ signal }) => etiquetasApi.getOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
}

/**
 * Tras cualquier cambio: listas y opciones quedan obsoletas, y también las cachés de otros
 * módulos que muestran datos de este (QUERY_DEPENDENCIES: etiquetas en joins, blog…)
 */
function useInvalidateEtiquetas() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: etiquetaKeys.lists() })
    qc.invalidateQueries({ queryKey: etiquetaKeys.options() })
    invalidateDependents(qc, 'etiquetas')
  }
}

/** Listado paginado: mantiene la página anterior mientras carga y precarga la siguiente */
export function useEtiquetas(filters: EtiquetaFilters = {}) {
  const qc = useQueryClient()
  const query = useQuery({ ...etiquetaQueries.list(filters), placeholderData: keepPreviousData })

  const page = filters.page ?? 1
  const lastPage = query.data?.last_page
  useEffect(() => {
    if (query.isPlaceholderData || !lastPage || page >= lastPage) return
    qc.prefetchQuery(etiquetaQueries.list({ ...filters, page: page + 1 }))
  }, [qc, filters, page, lastPage, query.isPlaceholderData])

  return query
}

export function useEtiqueta(id: number) {
  return useQuery(etiquetaQueries.detail(id))
}

/** [{ value, label }] para selects de otros módulos */
export function useEtiquetasOptions() {
  return useQuery(etiquetaQueries.options())
}

/** Precarga el detalle (al pasar el mouse por "Editar") */
export function usePrefetchEtiqueta() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(etiquetaQueries.detail(id))
}

export function useCreateEtiqueta() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEtiquetas()
  return useMutation({
    meta: { successToast: t.created },
    mutationFn: (dto: CreateEtiquetaInput) => etiquetasApi.create(dto),
    onSuccess: item => {
      qc.setQueryData(etiquetaKeys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useUpdateEtiqueta(id: number) {
  const qc = useQueryClient()
  const invalidate = useInvalidateEtiquetas()
  return useMutation({
    meta: { successToast: t.updated },
    mutationFn: (dto: UpdateEtiquetaInput) => etiquetasApi.update(id, dto),
    onSuccess: item => {
      qc.setQueryData(etiquetaKeys.detail(id), item)
      invalidate()
    },
  })
}

export function useDeleteEtiqueta() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEtiquetas()
  return useMutation({
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => etiquetasApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: etiquetaKeys.detail(id) })
      invalidate()
    },
  })
}

/** Acción en lote (delete) */
export function useBulkEtiquetas() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEtiquetas()
  return useMutation({
    meta: { successToast: bulkToast },
    mutationFn: ({ action, ids }: { action: BulkEtiquetaAction; ids: number[] }) => etiquetasApi.bulk(action, ids),
    onSuccess: (_, { ids }) => {
      ids.forEach(id => qc.removeQueries({ queryKey: etiquetaKeys.detail(id) }))
      invalidate()
    },
  })
}

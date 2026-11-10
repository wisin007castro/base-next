import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { publicacionesApi } from '@/lib/api/publicaciones.api'
import { publicacionKeys } from '@/lib/constants/query-keys'
import { invalidateDependents } from '@/lib/hooks/invalidate-dependents'
import type { PublicacionFilters } from '@/lib/types/publicacion.types'
import type {
  BulkPublicacionAction,
  CreatePublicacionInput,
  UpdatePublicacionInput,
} from '@/lib/api/schemas/publicacion.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

const t = crudToasts('Publicación', true)

export const publicacionQueries = {
  list: (filters: PublicacionFilters) =>
    queryOptions({
      queryKey: publicacionKeys.list(filters),
      queryFn: ({ signal }) => publicacionesApi.getAll(filters, signal),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: publicacionKeys.detail(id),
      queryFn: ({ signal }) => publicacionesApi.getById(id, signal),
      enabled: !!id,
    }),

  options: () =>
    queryOptions({
      queryKey: publicacionKeys.options(),
      queryFn: ({ signal }) => publicacionesApi.getOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
}

/**
 * Tras cualquier cambio: listas y opciones quedan obsoletas, y también las cachés de otros
 * módulos que muestran datos de este (QUERY_DEPENDENCIES: etiquetas en joins, blog…)
 */
function useInvalidatePublicaciones() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: publicacionKeys.lists() })
    qc.invalidateQueries({ queryKey: publicacionKeys.options() })
    invalidateDependents(qc, 'publicaciones')
  }
}

/** Listado paginado: mantiene la página anterior mientras carga y precarga la siguiente */
export function usePublicaciones(filters: PublicacionFilters = {}) {
  const qc = useQueryClient()
  const query = useQuery({ ...publicacionQueries.list(filters), placeholderData: keepPreviousData })

  const page = filters.page ?? 1
  const lastPage = query.data?.last_page
  useEffect(() => {
    if (query.isPlaceholderData || !lastPage || page >= lastPage) return
    qc.prefetchQuery(publicacionQueries.list({ ...filters, page: page + 1 }))
  }, [qc, filters, page, lastPage, query.isPlaceholderData])

  return query
}

export function usePublicacion(id: number) {
  return useQuery(publicacionQueries.detail(id))
}

/** [{ value, label }] para selects de otros módulos */
export function usePublicacionesOptions() {
  return useQuery(publicacionQueries.options())
}

/** Precarga el detalle (al pasar el mouse por "Editar") */
export function usePrefetchPublicacion() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(publicacionQueries.detail(id))
}

export function useCreatePublicacion() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: t.created },
    mutationFn: (dto: CreatePublicacionInput) => publicacionesApi.create(dto),
    onSuccess: item => {
      qc.setQueryData(publicacionKeys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useUpdatePublicacion(id: number) {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: t.updated },
    mutationFn: (dto: UpdatePublicacionInput) => publicacionesApi.update(id, dto),
    onSuccess: item => {
      qc.setQueryData(publicacionKeys.detail(id), item)
      invalidate()
    },
  })
}

export function useDeletePublicacion() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => publicacionesApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: publicacionKeys.detail(id) })
      invalidate()
    },
  })
}

export function useRestorePublicacion() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: t.restored, errorToast: true },
    mutationFn: (id: number) => publicacionesApi.restore(id),
    onSuccess: item => {
      qc.setQueryData(publicacionKeys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useForceDeletePublicacion() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: t.forceDeleted, errorToast: true },
    mutationFn: (id: number) => publicacionesApi.forceDelete(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: publicacionKeys.detail(id) })
      invalidate()
    },
  })
}

/** Acción en lote (delete / restore / force_delete) */
export function useBulkPublicaciones() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    meta: { successToast: bulkToast },
    mutationFn: ({ action, ids }: { action: BulkPublicacionAction; ids: number[] }) =>
      publicacionesApi.bulk(action, ids),
    onSuccess: (_, { ids }) => {
      ids.forEach(id => qc.removeQueries({ queryKey: publicacionKeys.detail(id) }))
      invalidate()
    },
  })
}

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { publicacionesApi } from '@/lib/api/publicaciones.api'
import { publicacionKeys } from '@/lib/constants/query-keys'
import type { PublicacionFilters } from '@/lib/types/publicacion.types'
import type { CreatePublicacionInput, UpdatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

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

/** Lista y opciones de select quedan obsoletas tras cualquier cambio */
function useInvalidatePublicaciones() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: publicacionKeys.lists() })
    qc.invalidateQueries({ queryKey: publicacionKeys.options() })
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
    mutationFn: (id: number) => publicacionesApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: publicacionKeys.detail(id) })
      invalidate()
    },
  })
}

export function useBulkDeletePublicaciones() {
  const qc = useQueryClient()
  const invalidate = useInvalidatePublicaciones()
  return useMutation({
    mutationFn: (ids: number[]) => publicacionesApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      ids.forEach(id => qc.removeQueries({ queryKey: publicacionKeys.detail(id) }))
      invalidate()
    },
  })
}

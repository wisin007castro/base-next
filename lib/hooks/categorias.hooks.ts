import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { categoriasApi } from '@/lib/api/categorias.api'
import { categoriaKeys } from '@/lib/constants/query-keys'
import { invalidateDependents } from '@/lib/hooks/invalidate-dependents'
import type { CategoriaFilters } from '@/lib/types/categoria.types'
import type {
  BulkCategoriaAction,
  CreateCategoriaInput,
  UpdateCategoriaInput,
} from '@/lib/api/schemas/categoria.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

const t = crudToasts('Categoría', true)

export const categoriaQueries = {
  list: (filters: CategoriaFilters) =>
    queryOptions({
      queryKey: categoriaKeys.list(filters),
      queryFn: ({ signal }) => categoriasApi.getAll(filters, signal),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: categoriaKeys.detail(id),
      queryFn: ({ signal }) => categoriasApi.getById(id, signal),
      enabled: !!id,
    }),

  options: () =>
    queryOptions({
      queryKey: categoriaKeys.options(),
      queryFn: ({ signal }) => categoriasApi.getOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
}

/**
 * Tras cualquier cambio: listas y opciones quedan obsoletas, y también las cachés de otros
 * módulos que muestran datos de este (QUERY_DEPENDENCIES: etiquetas en joins, blog…)
 */
function useInvalidateCategorias() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: categoriaKeys.lists() })
    qc.invalidateQueries({ queryKey: categoriaKeys.options() })
    invalidateDependents(qc, 'categorias')
  }
}

/** Listado paginado: mantiene la página anterior mientras carga y precarga la siguiente */
export function useCategorias(filters: CategoriaFilters = {}) {
  const qc = useQueryClient()
  const query = useQuery({ ...categoriaQueries.list(filters), placeholderData: keepPreviousData })

  const page = filters.page ?? 1
  const lastPage = query.data?.last_page
  useEffect(() => {
    if (query.isPlaceholderData || !lastPage || page >= lastPage) return
    qc.prefetchQuery(categoriaQueries.list({ ...filters, page: page + 1 }))
  }, [qc, filters, page, lastPage, query.isPlaceholderData])

  return query
}

export function useCategoria(id: number) {
  return useQuery(categoriaQueries.detail(id))
}

/** [{ value, label }] para selects de otros módulos */
export function useCategoriasOptions() {
  return useQuery(categoriaQueries.options())
}

/** Precarga el detalle (al pasar el mouse por "Editar") */
export function usePrefetchCategoria() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(categoriaQueries.detail(id))
}

export function useCreateCategoria() {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: t.created },
    mutationFn: (dto: CreateCategoriaInput) => categoriasApi.create(dto),
    onSuccess: item => {
      qc.setQueryData(categoriaKeys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useUpdateCategoria(id: number) {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: t.updated },
    mutationFn: (dto: UpdateCategoriaInput) => categoriasApi.update(id, dto),
    onSuccess: item => {
      qc.setQueryData(categoriaKeys.detail(id), item)
      invalidate()
    },
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => categoriasApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: categoriaKeys.detail(id) })
      invalidate()
    },
  })
}

export function useRestoreCategoria() {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: t.restored, errorToast: true },
    mutationFn: (id: number) => categoriasApi.restore(id),
    onSuccess: item => {
      qc.setQueryData(categoriaKeys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useForceDeleteCategoria() {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: t.forceDeleted, errorToast: true },
    mutationFn: (id: number) => categoriasApi.forceDelete(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: categoriaKeys.detail(id) })
      invalidate()
    },
  })
}

/** Acción en lote (delete / restore / force_delete) */
export function useBulkCategorias() {
  const qc = useQueryClient()
  const invalidate = useInvalidateCategorias()
  return useMutation({
    meta: { successToast: bulkToast },
    mutationFn: ({ action, ids }: { action: BulkCategoriaAction; ids: number[] }) => categoriasApi.bulk(action, ids),
    onSuccess: (_, { ids }) => {
      ids.forEach(id => qc.removeQueries({ queryKey: categoriaKeys.detail(id) }))
      invalidate()
    },
  })
}

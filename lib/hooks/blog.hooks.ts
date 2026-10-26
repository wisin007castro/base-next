import { useEffect } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query'
import { blogApi } from '@/lib/api/blog.api'
import { blogKeys } from '@/lib/constants/query-keys'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { BlogFilters, BlogPost, VotoValor } from '@/lib/types/blog.types'
import type { ComentarioInput } from '@/lib/api/schemas/blog.schema'

export const blogQueries = {
  list: (filters: BlogFilters) =>
    queryOptions({
      queryKey: blogKeys.list(filters),
      queryFn: ({ signal }) => blogApi.getPosts(filters, signal),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: blogKeys.detail(id),
      queryFn: ({ signal }) => blogApi.getPost(id, signal),
      enabled: !!id,
    }),
  comentarios: (id: number) =>
    queryOptions({
      queryKey: blogKeys.comentarios(id),
      queryFn: ({ signal }) => blogApi.getComentarios(id, signal),
      enabled: !!id,
    }),
  categorias: () =>
    queryOptions({
      queryKey: blogKeys.categorias(),
      queryFn: ({ signal }) => blogApi.getCategorias(signal),
      staleTime: 5 * 60 * 1000,
    }),
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export function useBlogPosts(filters: BlogFilters) {
  const qc = useQueryClient()
  const query = useQuery({ ...blogQueries.list(filters), placeholderData: keepPreviousData })

  // Las tarjetas ya traen todo lo del detalle: sembrar la caché hace que abrir un post sea instantáneo
  useEffect(() => {
    query.data?.data.forEach(post => qc.setQueryData(blogKeys.detail(post.id), post))
  }, [qc, query.data])

  return query
}

export const useBlogPost = (id: number) => useQuery(blogQueries.detail(id))
export const useBlogCategorias = () => useQuery(blogQueries.categorias())
export const useComentarios = (postId: number) => useQuery(blogQueries.comentarios(postId))

/** Precarga detalle + comentarios (al pasar el mouse por una tarjeta) */
export function usePrefetchBlogPost() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(blogQueries.comentarios(id))
}

// ─── Escritura ────────────────────────────────────────────────────────────────

/** Aplica un cambio a un post en el detalle y en todas las páginas del listado cacheadas */
function patchPost(qc: QueryClient, id: number, patch: (p: BlogPost) => BlogPost) {
  qc.setQueryData<BlogPost>(blogKeys.detail(id), old => (old ? patch(old) : old))
  qc.setQueriesData<PaginatedResponse<BlogPost>>({ queryKey: blogKeys.lists() }, old =>
    old ? { ...old, data: old.data.map(p => (p.id === id ? patch(p) : p)) } : old,
  )
}

/**
 * Votar con actualización optimista: el contador cambia al instante en la tarjeta y en el detalle,
 * se revierte si la API falla y se corrige con el puntaje real que devuelve el servidor.
 */
export function useVotar(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (valor: VotoValor) => blogApi.votar(postId, valor),
    onMutate: async valor => {
      await qc.cancelQueries({ queryKey: blogKeys.detail(postId), exact: true })
      const previousDetail = qc.getQueryData<BlogPost>(blogKeys.detail(postId))
      const previousLists = qc.getQueriesData<PaginatedResponse<BlogPost>>({ queryKey: blogKeys.lists() })
      patchPost(qc, postId, p => ({ ...p, puntaje: p.puntaje - p.mi_voto + valor, mi_voto: valor }))
      return { previousDetail, previousLists }
    },
    onError: (_err, _valor, ctx) => {
      if (!ctx) return
      qc.setQueryData(blogKeys.detail(postId), ctx.previousDetail)
      ctx.previousLists.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSuccess: ({ puntaje, mi_voto }) => patchPost(qc, postId, p => ({ ...p, puntaje, mi_voto })),
  })
}

export function useComentar(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ComentarioInput) => blogApi.comentar(postId, dto),
    onSuccess: comentario => {
      qc.setQueryData(blogKeys.comentarios(postId), (old: (typeof comentario)[] | undefined) => [
        ...(old ?? []),
        comentario,
      ])
      patchPost(qc, postId, p => ({ ...p, comentarios_count: p.comentarios_count + 1 }))
    },
  })
}

export function useEliminarComentario(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comentarioId: number) => blogApi.eliminarComentario(postId, comentarioId),
    onSuccess: (_, comentarioId) => {
      qc.setQueryData(blogKeys.comentarios(postId), (old: { id: number }[] | undefined) =>
        old?.filter(c => c.id !== comentarioId),
      )
      patchPost(qc, postId, p => ({ ...p, comentarios_count: Math.max(0, p.comentarios_count - 1) }))
    },
  })
}

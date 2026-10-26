import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { BlogCategoria, BlogFilters, BlogPost, Comentario, VotoValor } from '@/lib/types/blog.types'
import type { ComentarioInput } from '@/lib/api/schemas/blog.schema'

export const blogApi = {
  getPosts: (filters: BlogFilters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<BlogPost>>(`/blog${toQueryString(filters)}`, { signal }),

  getPost: (id: number, signal?: AbortSignal) => request<BlogPost>(`/blog/${id}`, { signal }),

  getCategorias: (signal?: AbortSignal) => request<BlogCategoria[]>('/blog/categorias', { signal }),

  getComentarios: (postId: number, signal?: AbortSignal) =>
    request<Comentario[]>(`/blog/${postId}/comentarios`, { signal }),

  comentar: (postId: number, dto: ComentarioInput) =>
    request<Comentario>(`/blog/${postId}/comentarios`, { method: 'POST', body: JSON.stringify(dto) }),

  eliminarComentario: (postId: number, comentarioId: number) =>
    request<void>(`/blog/${postId}/comentarios/${comentarioId}`, { method: 'DELETE' }),

  votar: (postId: number, valor: VotoValor) =>
    request<{ puntaje: number; mi_voto: VotoValor }>(`/blog/${postId}/voto`, {
      method: 'PUT',
      body: JSON.stringify({ valor }),
    }),
}

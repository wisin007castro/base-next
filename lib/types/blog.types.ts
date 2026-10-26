import type { RefLabel } from '@/lib/types/publicacion.types'

export type VotoValor = -1 | 0 | 1

/** Publicación tal como la ve un lector del blog (solo publicadas) */
export interface BlogPost {
  id: number
  titulo: string
  resumen: string | null
  contenido: string
  fecha_publicacion: string | null
  created_at: string
  categoria: RefLabel
  autor: RefLabel
  comentarios_count: number
  /** Suma de votos (+1 / -1) */
  puntaje: number
  /** Voto del usuario actual */
  mi_voto: VotoValor
}

export interface Comentario {
  id: number
  contenido: string
  created_at: string
  autor: RefLabel
  /** El autor, un admin o quien tenga `publicaciones.edit` (moderación) */
  puedo_eliminar: boolean
}

export interface BlogCategoria {
  value: number
  label: string
  /** Publicaciones publicadas en la categoría */
  total: number
}

export interface BlogFilters {
  page?: number
  per_page?: number
  search?: string
  categoria_id?: number
  orden?: 'recientes' | 'populares'
}

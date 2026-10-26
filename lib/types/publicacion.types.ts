/** Registro relacionado tal como lo incluye la API */
export interface RefLabel {
  id: number
  label: string
}

/** publicación tal como lo devuelve la API */
export interface Publicacion {
  id: number
  titulo: string
  resumen: string | null
  contenido: string
  categoria_id: number
  publicada: boolean
  fecha_publicacion: string | null
  autor_id: number
  /** Categoría (incluido por la API) */
  categoria: RefLabel
  /** Autor (incluido por la API) */
  autor: RefLabel
  created_at: string
  updated_at: string
}

/** Filtros del listado (query string de GET /api/publicaciones) */
export interface PublicacionFilters {
  page?: number
  per_page?: number
  /** `campo` asc, `-campo` desc */
  sort?: string
  search?: string
  categoria_id?: number
  publicada?: string
}

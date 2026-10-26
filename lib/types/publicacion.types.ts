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
  etiqueta_ids: number[]
  publicada: boolean
  fecha_publicacion: string | null
  autor_id: number
  /** Categoría (incluido por la API) */
  categoria: RefLabel
  /** Autor (incluido por la API) */
  autor: RefLabel
  /** Etiquetas (incluidos por la API) */
  etiquetas: RefLabel[]
  created_at: string
  updated_at: string
  /** Fecha de eliminación (soft delete), o null si está activo */
  deleted_at: string | null
}

/** Filtros del listado (query string de GET /api/publicaciones) */
export interface PublicacionFilters {
  page?: number
  per_page?: number
  /** `campo` asc, `-campo` desc */
  sort?: string
  search?: string
  with_trashed?: boolean
  categoria_id?: number
  etiqueta_ids?: number
  publicada?: string
}

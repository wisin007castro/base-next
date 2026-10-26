/** Registro relacionado tal como lo incluye la API */
export interface RefLabel {
  id: number
  label: string
}

/** categoría tal como lo devuelve la API */
export interface Categoria {
  id: number
  nombre: string
  descripcion: string | null

  created_at: string
  updated_at: string
}

/** Filtros del listado (query string de GET /api/categorias) */
export interface CategoriaFilters {
  page?: number
  per_page?: number
  /** `campo` asc, `-campo` desc */
  sort?: string
  search?: string
}

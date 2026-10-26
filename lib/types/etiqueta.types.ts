/** Registro relacionado tal como lo incluye la API */
export interface RefLabel {
  id: number
  label: string
}

/** etiqueta tal como lo devuelve la API */
export interface Etiqueta {
  id: number
  nombre: string

  created_at: string
  updated_at: string
}

/** Filtros del listado (query string de GET /api/etiquetas) */
export interface EtiquetaFilters {
  page?: number
  per_page?: number
  /** `campo` asc, `-campo` desc */
  sort?: string
  search?: string
}

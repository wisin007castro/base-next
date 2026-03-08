import type { Role } from './rbac.types'

export type DocumentType = 'dni' | 'pasaporte' | 'cedula' | 'nie'

export type Gender = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir'

// -------------------------------------------------------------------
// Perfil personal del usuario
// -------------------------------------------------------------------
export interface UserProfile {
  id: number
  user_id: number
  nombre: string
  primer_apellido: string
  segundo_apellido: string | null
  tipo_documento: DocumentType
  numero_documento: string
  fecha_nacimiento: string // ISO 8601: YYYY-MM-DD
  genero: Gender
  // Contacto
  telefono: string | null
  telefono_alternativo: string | null
  // Dirección
  pais: string | null
  departamento: string | null
  ciudad: string | null
  direccion: string | null
  codigo_postal: string | null
  avatar_key: string | null
  avatar_url: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

// -------------------------------------------------------------------
// Usuario principal
// -------------------------------------------------------------------
export interface User {
  id: number
  username: string
  email: string
  email_verified_at: string | null
  is_active: boolean
  last_login_at: string | null
  remember_token: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Relaciones
  profile?: UserProfile
  roles?: Role[]
}

// -------------------------------------------------------------------
// DTOs
// -------------------------------------------------------------------
export type CreateUserDto = {
  username: string
  email: string
  password: string
  password_confirmation: string
  role_ids: number[]
  is_active: boolean
  profile: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
}

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password' | 'password_confirmation'>> & {
  password?: string
  password_confirmation?: string
}

// -------------------------------------------------------------------
// Paginación estilo Laravel
// -------------------------------------------------------------------
export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}

// -------------------------------------------------------------------
// Filtros de búsqueda
// -------------------------------------------------------------------
export interface UserFilters {
  search?: string
  is_active?: boolean
  role?: string
  page?: number
  per_page?: number
  with_trashed?: boolean
}

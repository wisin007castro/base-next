import type { UserFilters } from '@/lib/types/user.types'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  permissions: (id: number) => [...userKeys.all, id, 'permissions'] as const,
}

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  detail: (id: number) => [...roleKeys.all, 'detail', id] as const,
}

export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  detail: (id: number) => [...permissionKeys.all, 'detail', id] as const,
}

export const meKeys = {
  all: ['me'] as const,
  detail: () => [...meKeys.all, 'detail'] as const,
  sessions: () => [...meKeys.all, 'sessions'] as const,
}

export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  preview: (token: string) => [...invitationKeys.all, 'preview', token] as const,
}

export const settingsKeys = {
  all: ['settings'] as const,
  section: (section: 'system' | 'access' | 'mail') => [...settingsKeys.all, section] as const,
  public: () => [...settingsKeys.all, 'public'] as const,
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

/** Blog (lectura): publicaciones publicadas, comentarios y categorías con posts */
export const blogKeys = {
  all: ['blog'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (filters: object) => [...blogKeys.lists(), filters] as const,
  details: () => [...blogKeys.all, 'detail'] as const,
  detail: (id: number) => [...blogKeys.details(), id] as const,
  comentarios: (id: number) => [...blogKeys.detail(id), 'comentarios'] as const,
  categorias: () => [...blogKeys.all, 'categorias'] as const,
}

// Módulos generados con `npm run gen:crud`
// @gen:begin etiquetas
export const etiquetaKeys = {
  all: ['etiquetas'] as const,
  lists: () => [...etiquetaKeys.all, 'list'] as const,
  list: (filters: object) => [...etiquetaKeys.lists(), filters] as const,
  details: () => [...etiquetaKeys.all, 'detail'] as const,
  detail: (id: number) => [...etiquetaKeys.details(), id] as const,
  options: () => [...etiquetaKeys.all, 'options'] as const,
}
// @gen:end etiquetas
// @gen:begin categorias
export const categoriaKeys = {
  all: ['categorias'] as const,
  lists: () => [...categoriaKeys.all, 'list'] as const,
  list: (filters: object) => [...categoriaKeys.lists(), filters] as const,
  details: () => [...categoriaKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoriaKeys.details(), id] as const,
  options: () => [...categoriaKeys.all, 'options'] as const,
}
// @gen:end categorias
// @gen:begin publicaciones
export const publicacionKeys = {
  all: ['publicaciones'] as const,
  lists: () => [...publicacionKeys.all, 'list'] as const,
  list: (filters: object) => [...publicacionKeys.lists(), filters] as const,
  details: () => [...publicacionKeys.all, 'detail'] as const,
  detail: (id: number) => [...publicacionKeys.details(), id] as const,
  options: () => [...publicacionKeys.all, 'options'] as const,
}
// @gen:end publicaciones
// @gen:query-keys

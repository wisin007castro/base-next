/**
 * Permisos de los módulos CRUD y qué ruta protegen.
 *
 * - `middleware` (auth.config.ts) lo usa para proteger las páginas: sin el permiso de la página
 *   (view / create en /nuevo / edit en /editar) y sin rol admin, se redirige a la home.
 * - `npm run db:permissions` crea en la base los permisos que falten y se los asigna al rol admin.
 * - `/api/<modulo>/options` deja pasar también a quien crea/edita un módulo que lo referencia.
 *
 * Archivo Edge-safe: sin imports. `npm run gen:crud` agrega entradas antes del marcador.
 */
export interface ModulePermissions {
  /** Prefijo de ruta de las páginas del módulo */
  path: string
  /** Prefijo de los permisos: `${prefix}.view|create|edit|delete` */
  prefix: string
  label: string
  /** Módulos a los que apunta (campos ref / many), por prefijo */
  refs?: string[]
  /** Con soft delete: agrega el permiso `force_delete` (borrado definitivo) */
  softDelete?: boolean
}

export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'force_delete'] as const
export type ModuleAction = (typeof MODULE_ACTIONS)[number]

const ACTION_LABELS: Record<ModuleAction, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar / restaurar',
  force_delete: 'Eliminar definitivamente',
}

export const MODULES: ModulePermissions[] = [
  { path: '/categorias', prefix: 'categorias', label: 'Categorías' },
  { path: '/publicaciones', prefix: 'publicaciones', label: 'Publicaciones' },
  // @gen:modules
]

export const permissionName = (prefix: string, action: ModuleAction) => `${prefix}.${action}`

const actionsOf = (m: ModulePermissions) => MODULE_ACTIONS.filter(a => a !== 'force_delete' || m.softDelete)

/** Todos los permisos de los módulos, con descripción legible */
export const modulePermissionList = () =>
  MODULES.flatMap(m =>
    actionsOf(m).map(action => ({
      name: permissionName(m.prefix, action),
      description: `${ACTION_LABELS[action]} ${m.label.toLowerCase()}`,
    })),
  )

/**
 * Quién puede leer las opciones (selects) de un módulo: quien lo ve, o quien crea/edita
 * un módulo que lo referencia (si no, el select de "Categoría" sale vacío para un editor
 * de publicaciones sin `categorias.view`).
 */
export const optionsPermissions = (prefix: string) => [
  permissionName(prefix, 'view'),
  ...MODULES.filter(m => m.refs?.includes(prefix)).flatMap(m => [
    permissionName(m.prefix, 'create'),
    permissionName(m.prefix, 'edit'),
  ]),
]

/**
 * Permiso requerido para una página de módulo, o null si la ruta no es de un módulo:
 * `/x/nuevo` → create, `/x/:id/editar` → edit, el resto → view.
 */
export const permissionForPath = (pathname: string) => {
  const m = MODULES.find(m => pathname === m.path || pathname.startsWith(`${m.path}/`))
  if (!m) return null
  const action: ModuleAction = pathname.endsWith('/nuevo') ? 'create' : pathname.endsWith('/editar') ? 'edit' : 'view'
  return permissionName(m.prefix, action)
}

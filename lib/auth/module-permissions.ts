/**
 * Permisos de los módulos CRUD y qué ruta protegen.
 *
 * - `middleware` (auth.config.ts) lo usa para proteger las páginas: sin el permiso de la página
 *   (view / create en /nuevo / edit en /editar) y sin rol admin, se redirige a la home.
 * - `npm run db:permissions` crea en la base los permisos que falten y se los asigna al rol admin.
 *
 * Archivo Edge-safe: sin imports. `npm run gen:crud` agrega entradas antes del marcador.
 */
export interface ModulePermissions {
  /** Prefijo de ruta de las páginas del módulo */
  path: string
  /** Prefijo de los permisos: `${prefix}.view|create|edit|delete` */
  prefix: string
  label: string
}

export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type ModuleAction = (typeof MODULE_ACTIONS)[number]

const ACTION_LABELS: Record<ModuleAction, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
}

export const MODULES: ModulePermissions[] = [
  // @gen:modules
]

export const permissionName = (prefix: string, action: ModuleAction) => `${prefix}.${action}`

/** Todos los permisos de los módulos, con descripción legible */
export const modulePermissionList = () =>
  MODULES.flatMap(m =>
    MODULE_ACTIONS.map(action => ({
      name: permissionName(m.prefix, action),
      description: `${ACTION_LABELS[action]} ${m.label.toLowerCase()}`,
    })),
  )

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

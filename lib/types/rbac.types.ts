export interface Role {
  id: number
  name: string
  description: string | null
  guard_name: string
  created_at: string
  updated_at: string
  permissions?: Permission[]
}

export interface Permission {
  id: number
  name: string
  description: string | null
  guard_name: string
  created_at: string
  updated_at: string
}

export type CreateRoleDto = {
  name: string
  description?: string
  guard_name?: string
  permission_ids?: number[]
}

export type UpdateRoleDto = Partial<CreateRoleDto>

export type CreatePermissionDto = {
  name: string
  description?: string
  guard_name?: string
}

/** Privilegio de un usuario sobre un permiso (concede o deniega, con motivo y caducidad) */
export interface Privilege {
  permission: { id: number; name: string; description: string | null }
  effect: 'grant' | 'deny'
  reason: string | null
  /** ISO; null = sin caducidad */
  expires_at: string | null
  /** false si ya caducó (se conserva para el historial, pero no cuenta) */
  active: boolean
  granted_by: { id: number; label: string } | null
  created_at: string
}

export interface UserPrivileges {
  privileges: Privilege[]
  /** Permisos efectivos: roles + concedidos − denegados (los vigentes) */
  effective: string[]
}

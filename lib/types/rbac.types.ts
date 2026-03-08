export interface Role {
  id:          number
  name:        string
  description: string | null
  guard_name:  string
  created_at:  string
  updated_at:  string
  permissions?: Permission[]
}

export interface Permission {
  id:          number
  name:        string
  description: string | null
  guard_name:  string
  created_at:  string
  updated_at:  string
}

export type CreateRoleDto = {
  name:        string
  description?: string
  guard_name?: string
  permission_ids?: number[]
}

export type UpdateRoleDto = Partial<CreateRoleDto>

export type CreatePermissionDto = {
  name:        string
  description?: string
  guard_name?: string
}

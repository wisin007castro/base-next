import { z } from '@/lib/validation/zod-config'
import { createPermissionSchema } from '@/lib/api/schemas/permission.schema'
import { createRoleSchema } from '@/lib/api/schemas/role.schema'
import type { Permission, Role } from '@/lib/types/rbac.types'

// Las reglas de cada campo vienen del schema del servidor: una sola fuente de verdad

// ─── Permiso ──────────────────────────────────────────────────────────────────
export const permissionFormSchema = z.object({
  name: createPermissionSchema.shape.name,
  description: z.string().max(255),
})

export type PermissionFormValues = z.infer<typeof permissionFormSchema>

export const permissionFormDefaults = (p?: Permission): PermissionFormValues => ({
  name: p?.name ?? '',
  description: p?.description ?? '',
})

export const toPermissionDto = (v: PermissionFormValues) => ({
  name: v.name,
  description: v.description || undefined,
})

// ─── Rol ──────────────────────────────────────────────────────────────────────
export const roleFormSchema = z.object({
  name: createRoleSchema.shape.name,
  description: z.string().max(255),
  permission_ids: z.array(z.number().int().positive()),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export const roleFormDefaults = (r?: Role): RoleFormValues => ({
  name: r?.name ?? '',
  description: r?.description ?? '',
  permission_ids: r?.permissions?.map(p => p.id) ?? [],
})

export const toRoleDto = (v: RoleFormValues) => ({
  name: v.name,
  description: v.description || undefined,
  permission_ids: v.permission_ids,
})

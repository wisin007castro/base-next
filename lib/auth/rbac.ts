import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { roles, permissions, userRoles, userPermissions, rolePermissions } from '@/lib/db/schema'

// -------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------

/** Roles asignados al usuario */
export async function getUserRoles(userId: number): Promise<string[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
  return rows.map((r) => r.name)
}

/** Permisos efectivos: directos + heredados de roles */
export async function getUserPermissions(userId: number): Promise<string[]> {
  // Permisos directos
  const direct = await db
    .select({ name: permissions.name })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(eq(userPermissions.userId, userId))

  // IDs de roles del usuario
  const roleIds = (
    await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
  ).map((r) => r.roleId)

  // Permisos heredados de roles
  let viaRoles: { name: string }[] = []
  if (roleIds.length > 0) {
    viaRoles = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(inArray(rolePermissions.roleId, roleIds))
  }

  return [...new Set([...direct.map((p) => p.name), ...viaRoles.map((p) => p.name)])]
}

// -------------------------------------------------------------------
// Checks (equivalente a $user->hasRole() y $user->can() de Spatie)
// -------------------------------------------------------------------

export async function hasRole(userId: number, role: string): Promise<boolean> {
  const roleNames = await getUserRoles(userId)
  return roleNames.includes(role)
}

export async function hasAnyRole(userId: number, roleList: string[]): Promise<boolean> {
  const roleNames = await getUserRoles(userId)
  return roleList.some((r) => roleNames.includes(r))
}

export async function can(userId: number, permission: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.includes(permission)
}

export async function canAny(userId: number, permList: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return permList.some((p) => perms.includes(p))
}

// -------------------------------------------------------------------
// Asignaciones
// -------------------------------------------------------------------

export async function assignRole(userId: number, roleId: number) {
  await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing()
}

export async function removeRole(userId: number, roleId: number) {
  await db
    .delete(userRoles)
    .where(eq(userRoles.userId, userId))
}

export async function syncRoles(userId: number, roleIds: number[]) {
  await db.delete(userRoles).where(eq(userRoles.userId, userId))
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId, roleId })))
  }
}

export async function givePermissionTo(userId: number, permissionId: number) {
  await db.insert(userPermissions).values({ userId, permissionId }).onConflictDoNothing()
}

export async function revokePermission(userId: number, permissionId: number) {
  await db
    .delete(userPermissions)
    .where(eq(userPermissions.userId, userId))
}

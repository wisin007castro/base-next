import { eq, and, gt, inArray, isNull, or } from 'drizzle-orm'
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
  return rows.map(r => r.name)
}

/** Privilegio vigente: sin caducidad o que caduca en el futuro */
export const privilegeActive = () =>
  or(isNull(userPermissions.expiresAt), gt(userPermissions.expiresAt, new Date().toISOString()))

/**
 * Permisos efectivos = (heredados de roles ∪ privilegios que conceden) − privilegios que deniegan.
 * Solo cuentan los privilegios vigentes. Ojo: el rol `admin` pasa todos los checks igualmente
 * (requirePermission / useCan), así que una denegación no le afecta.
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const direct = await db
    .select({ name: permissions.name, effect: userPermissions.effect })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(and(eq(userPermissions.userId, userId), privilegeActive()))

  const roleIds = (
    await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId))
  ).map(r => r.roleId)

  let viaRoles: { name: string }[] = []
  if (roleIds.length > 0) {
    viaRoles = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(inArray(rolePermissions.roleId, roleIds))
  }

  const denied = new Set(direct.filter(p => p.effect === 'deny').map(p => p.name))
  const granted = direct.filter(p => p.effect === 'grant').map(p => p.name)
  return [...new Set([...viaRoles.map(p => p.name), ...granted])].filter(name => !denied.has(name))
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
  return roleList.some(r => roleNames.includes(r))
}

export async function can(userId: number, permission: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.includes(permission)
}

export async function canAny(userId: number, permList: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return permList.some(p => perms.includes(p))
}

// -------------------------------------------------------------------
// Asignaciones
// -------------------------------------------------------------------

export async function assignRole(userId: number, roleId: number) {
  await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing()
}

export async function removeRole(userId: number, roleId: number) {
  await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
}

export async function syncRoles(userId: number, roleIds: number[]) {
  await db.delete(userRoles).where(eq(userRoles.userId, userId))
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })))
  }
}

/** Crea o reemplaza el privilegio del usuario sobre un permiso */
export async function setPrivilege(
  userId: number,
  permissionId: number,
  p: { effect: 'grant' | 'deny'; reason?: string | null; expiresAt?: string | null; grantedById?: number | null },
) {
  const values = {
    effect: p.effect,
    reason: p.reason ?? null,
    expiresAt: p.expiresAt ?? null,
    grantedById: p.grantedById ?? null,
    createdAt: new Date().toISOString(),
  }
  await db
    .insert(userPermissions)
    .values({ userId, permissionId, ...values })
    .onConflictDoUpdate({ target: [userPermissions.userId, userPermissions.permissionId], set: values })
}

export async function revokePermission(userId: number, permissionId: number) {
  await db
    .delete(userPermissions)
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, permissionId)))
}

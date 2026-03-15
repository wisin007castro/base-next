import { NextResponse } from 'next/server'
import { isNull, isNotNull, eq, gte, and, count, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, roles, permissions } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'

// GET /api/dashboard
export async function GET() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    [{ total: totalUsers }],
    [{ total: activeUsers }],
    [{ total: inactiveUsers }],
    [{ total: deletedUsers }],
    [{ total: newThisWeek }],
    [{ total: totalRoles }],
    [{ total: totalPermissions }],
    recentUsers,
  ] = await Promise.all([
    // Total usuarios (no eliminados)
    db.select({ total: count() }).from(users).where(isNull(users.deletedAt)),
    // Activos
    db.select({ total: count() }).from(users).where(
      and(isNull(users.deletedAt), eq(users.isActive, true)),
    ),
    // Inactivos
    db.select({ total: count() }).from(users).where(
      and(isNull(users.deletedAt), eq(users.isActive, false)),
    ),
    // Eliminados (soft delete)
    db.select({ total: count() }).from(users).where(isNotNull(users.deletedAt)),
    // Nuevos esta semana (createdAt >= 7 días atrás, no eliminados)
    db.select({ total: count() }).from(users).where(
      and(isNull(users.deletedAt), gte(users.createdAt, sevenDaysAgo)),
    ),
    // Total roles
    db.select({ total: count() }).from(roles),
    // Total permisos
    db.select({ total: count() }).from(permissions),
    // Últimos 6 usuarios creados (no eliminados)
    db
      .select({ id: users.id, username: users.username, createdAt: users.createdAt, isActive: users.isActive })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt))
      .limit(6),
  ])

  return NextResponse.json({
    users: {
      total:         totalUsers,
      active:        activeUsers,
      inactive:      inactiveUsers,
      deleted:       deletedUsers,
      new_this_week: newThisWeek,
    },
    roles: {
      total: totalRoles,
    },
    permissions: {
      total: totalPermissions,
    },
    recentUsers,
  })
}

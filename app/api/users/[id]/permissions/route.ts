import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { permissions, userPermissions, users } from '@/lib/db/schema'
import { getUserPermissions, setPrivilege } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { expiresAtFromDate, privilegeSchema } from '@/lib/api/schemas/privilege.schema'
import { logger } from '@/lib/logger'
import type { UserPrivileges } from '@/lib/types/rbac.types'

interface Ctx {
  params: Promise<{ id: string }>
}

const grantedBy = alias(users, 'granted_by')

async function privilegesOf(userId: number): Promise<UserPrivileges> {
  const now = new Date().toISOString()
  const rows = await db
    .select({
      permission: { id: permissions.id, name: permissions.name, description: permissions.description },
      effect: userPermissions.effect,
      reason: userPermissions.reason,
      expiresAt: userPermissions.expiresAt,
      createdAt: userPermissions.createdAt,
      grantedById: grantedBy.id,
      grantedByName: grantedBy.username,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .leftJoin(grantedBy, eq(grantedBy.id, userPermissions.grantedById))
    .where(eq(userPermissions.userId, userId))
    .orderBy(asc(permissions.name))

  return {
    privileges: rows.map(r => ({
      permission: r.permission,
      effect: r.effect,
      reason: r.reason,
      expires_at: r.expiresAt,
      active: !r.expiresAt || r.expiresAt > now,
      granted_by: r.grantedById ? { id: r.grantedById, label: r.grantedByName! } : null,
      created_at: r.createdAt,
    })),
    effective: (await getUserPermissions(userId)).sort(),
  }
}

// GET /api/users/:id/permissions — privilegios del usuario y sus permisos efectivos
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard
  return NextResponse.json(await privilegesOf(Number((await params).id)))
}

// POST /api/users/:id/permissions — concede o deniega un permiso (reemplaza el privilegio previo)
export async function POST(req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const userId = Number((await params).id)
  const parsed = privilegeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
  const { permission_id, effect, reason, expires_on } = parsed.data

  const [user, permission] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } }),
    db.query.permissions.findFirst({ where: eq(permissions.id, permission_id), columns: { id: true, name: true } }),
  ])
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  if (!permission) {
    return NextResponse.json(
      {
        message: 'Datos inválidos',
        errors: { formErrors: [], fieldErrors: { permission_id: ['El permiso no existe'] } },
      },
      { status: 422 },
    )
  }

  await setPrivilege(userId, permission_id, {
    effect,
    reason,
    expiresAt: expiresAtFromDate(expires_on),
    grantedById: Number(guard.user.id),
  })
  logger.info(
    { module: 'rbac', userId, permission: permission.name, effect, expiresOn: expires_on, by: guard.user.id },
    'privilegio asignado',
  )
  return NextResponse.json(await privilegesOf(userId), { status: 201 })
}

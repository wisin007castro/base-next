import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userPermissions, permissions } from '@/lib/db/schema'
import { givePermissionTo } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

interface Ctx { params: Promise<{ id: string }> }

// GET /api/users/:id/permissions — lista los permisos directos del usuario
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const userId = Number(id)

  const rows = await db
    .select({
      id:          permissions.id,
      name:        permissions.name,
      description: permissions.description,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(eq(userPermissions.userId, userId))

  return NextResponse.json(rows)
}

// POST /api/users/:id/permissions — asigna un permiso directo al usuario
export async function POST(req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const userId = Number(id)

  const body = await req.json().catch(() => null)
  const permissionId = Number(body?.permission_id)

  if (!permissionId || isNaN(permissionId)) {
    return NextResponse.json({ message: 'permission_id es requerido' }, { status: 422 })
  }

  await givePermissionTo(userId, permissionId)

  return NextResponse.json({ message: 'Permiso asignado' }, { status: 201 })
}

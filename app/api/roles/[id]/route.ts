import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { roles, rolePermissions } from '@/lib/db/schema'
import { serializeRole } from '@/lib/api/serializers/user.serializer'
import { requireAuth, requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { updateRoleSchema } from '@/lib/api/schemas/role.schema'

type Params = { params: Promise<{ id: string }> }

// GET /api/roles/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const role = await db.query.roles.findFirst({
    where: eq(roles.id, Number(id)),
    with: { rolePermissions: { with: { permission: true } } },
  })
  if (!role) return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 })
  return NextResponse.json(serializeRole(role))
}

// PATCH /api/roles/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id }  = await params
  const roleId  = Number(id)
  const raw     = await req.json()
  const parsed  = updateRoleSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const now    = new Date().toISOString()
  const body   = parsed.data
  const values: Record<string, unknown> = { updatedAt: now }
  if (body.name        !== undefined) values.name        = body.name
  if (body.description !== undefined) values.description = body.description
  if (body.guard_name  !== undefined) values.guardName   = body.guard_name

  await db.update(roles).set(values).where(eq(roles.id, roleId))

  if (Array.isArray(body.permission_ids)) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (body.permission_ids.length > 0) {
      await db.insert(rolePermissions).values(
        body.permission_ids.map((pid: number) => ({ roleId, permissionId: pid })),
      )
    }
  }

  const result = await db.query.roles.findFirst({
    where: eq(roles.id, roleId),
    with: { rolePermissions: { with: { permission: true } } },
  })
  return NextResponse.json(serializeRole(result!))
}

// DELETE /api/roles/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  await db.delete(roles).where(eq(roles.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}

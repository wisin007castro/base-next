import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { roles, rolePermissions } from '@/lib/db/schema'
import { serializeRole } from '@/lib/api/serializers/user.serializer'
import { requireAuth, requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { createRoleSchema } from '@/lib/api/schemas/role.schema'

// GET /api/roles — cualquier usuario autenticado puede listar roles (para selects)
export async function GET() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const rows = await db.query.roles.findMany({
    with: { rolePermissions: { with: { permission: true } } },
    orderBy: roles.name,
  })
  return NextResponse.json(rows.map(serializeRole))
}

// POST /api/roles — solo admin
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const raw    = await req.json()
  const parsed = createRoleSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { name, description, guard_name, permission_ids } = parsed.data
  const now = new Date().toISOString()
  const [role] = await db
    .insert(roles)
    .values({ name, description: description ?? null, guardName: guard_name ?? 'web', createdAt: now, updatedAt: now })
    .returning()

  if (permission_ids?.length) {
    await db.insert(rolePermissions).values(
      permission_ids.map((pid: number) => ({ roleId: role.id, permissionId: pid })),
    )
  }

  const result = await db.query.roles.findFirst({
    where: eq(roles.id, role.id),
    with: { rolePermissions: { with: { permission: true } } },
  })
  return NextResponse.json(serializeRole(result!), { status: 201 })
}

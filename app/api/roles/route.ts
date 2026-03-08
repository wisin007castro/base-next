import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { roles, rolePermissions } from '@/lib/db/schema'
import { serializeRole } from '@/lib/api/serializers/user.serializer'

// GET /api/roles
export async function GET() {
  const rows = await db.query.roles.findMany({
    with: { rolePermissions: { with: { permission: true } } },
    orderBy: roles.name,
  })
  return NextResponse.json(rows.map(serializeRole))
}

// POST /api/roles
export async function POST(req: NextRequest) {
  const { name, description, guard_name, permission_ids } = await req.json()

  if (!name) return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 422 })

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

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { permissions } from '@/lib/db/schema'
import { serializePermission } from '@/lib/api/serializers/user.serializer'

// GET /api/permissions
export async function GET() {
  const rows = await db.query.permissions.findMany({ orderBy: permissions.name })
  return NextResponse.json(rows.map(serializePermission))
}

// POST /api/permissions
export async function POST(req: NextRequest) {
  const { name, description, guard_name } = await req.json()
  if (!name) return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 422 })

  const now = new Date().toISOString()
  const [perm] = await db
    .insert(permissions)
    .values({ name, description: description ?? null, guardName: guard_name ?? 'web', createdAt: now, updatedAt: now })
    .returning()

  return NextResponse.json(serializePermission(perm), { status: 201 })
}

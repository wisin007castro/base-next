import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { permissions } from '@/lib/db/schema'
import { serializePermission } from '@/lib/api/serializers/user.serializer'
import { requireAuth, requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { createPermissionSchema } from '@/lib/api/schemas/permission.schema'

// GET /api/permissions — cualquier usuario autenticado
export async function GET() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const rows = await db.query.permissions.findMany({ orderBy: permissions.name })
  return NextResponse.json(rows.map(serializePermission))
}

// POST /api/permissions — solo admin
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const raw    = await req.json()
  const parsed = createPermissionSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { name, description, guard_name } = parsed.data
  const now = new Date().toISOString()
  const [perm] = await db
    .insert(permissions)
    .values({ name, description: description ?? null, guardName: guard_name ?? 'web', createdAt: now, updatedAt: now })
    .returning()

  return NextResponse.json(serializePermission(perm), { status: 201 })
}

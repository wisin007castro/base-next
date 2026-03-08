import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { permissions } from '@/lib/db/schema'
import { serializePermission } from '@/lib/api/serializers/user.serializer'

type Params = { params: Promise<{ id: string }> }

// GET /api/permissions/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const perm = await db.query.permissions.findFirst({ where: eq(permissions.id, Number(id)) })
  if (!perm) return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 })
  return NextResponse.json(serializePermission(perm))
}

// PATCH /api/permissions/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const now = new Date().toISOString()

  const values: Record<string, unknown> = { updatedAt: now }
  if (body.name !== undefined) values.name = body.name
  if (body.description !== undefined) values.description = body.description
  if (body.guard_name !== undefined) values.guardName = body.guard_name

  await db.update(permissions).set(values).where(eq(permissions.id, Number(id)))

  const result = await db.query.permissions.findFirst({ where: eq(permissions.id, Number(id)) })
  if (!result) return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 })
  return NextResponse.json(serializePermission(result))
}

// DELETE /api/permissions/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await db.delete(permissions).where(eq(permissions.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}

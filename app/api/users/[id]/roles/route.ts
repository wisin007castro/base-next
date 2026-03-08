import { NextRequest, NextResponse } from 'next/server'
import { syncRoles } from '@/lib/auth/rbac'

// PUT /api/users/:id/roles — sincroniza los roles del usuario
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }     = await params
  const { role_ids } = await req.json()

  if (!Array.isArray(role_ids)) {
    return NextResponse.json({ message: 'role_ids debe ser un array' }, { status: 422 })
  }

  await syncRoles(Number(id), role_ids)
  return NextResponse.json({ message: 'Roles actualizados' })
}

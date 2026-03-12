import { NextRequest, NextResponse } from 'next/server'
import { revokePermission } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

interface Ctx { params: Promise<{ id: string; permId: string }> }

// DELETE /api/users/:id/permissions/:permId — revoca un permiso directo del usuario
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id, permId } = await params
  const userId       = Number(id)
  const permissionId = Number(permId)

  await revokePermission(userId, permissionId)

  return NextResponse.json({ message: 'Permiso revocado' })
}

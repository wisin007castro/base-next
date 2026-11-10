import { NextRequest, NextResponse } from 'next/server'
import { revokePermission } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { logger } from '@/lib/logger'

interface Ctx {
  params: Promise<{ id: string; permId: string }>
}

// DELETE /api/users/:id/permissions/:permId — quita el privilegio (vuelve a valer lo de los roles)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id, permId } = await params
  await revokePermission(Number(id), Number(permId))
  logger.info(
    { module: 'rbac', userId: Number(id), permissionId: Number(permId), by: guard.user.id },
    'privilegio quitado',
  )
  return new NextResponse(null, { status: 204 })
}

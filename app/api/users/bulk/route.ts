import { NextRequest, NextResponse } from 'next/server'
import { and, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { bulkUserActionSchema, type BulkUserAction } from '@/lib/api/schemas/user.schema'

/** Acciones que un admin no puede aplicarse a sí mismo (perdería el acceso) */
const SELF_FORBIDDEN: BulkUserAction[] = ['deactivate', 'delete']

// POST /api/users/bulk  { action, ids }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const parsed = bulkUserActionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { action } = parsed.data
  const selfId = Number(guard.user.id)
  const skipped = SELF_FORBIDDEN.includes(action) ? parsed.data.ids.filter(id => id === selfId) : []
  const ids = [...new Set(parsed.data.ids)].filter(id => !skipped.includes(id))

  if (ids.length === 0) {
    return NextResponse.json({ message: 'No puedes aplicarte esta acción a ti mismo' }, { status: 422 })
  }

  const now = new Date().toISOString()
  const values = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    delete: { deletedAt: now },
    restore: { deletedAt: null },
  }[action]

  // Solo filas a las que la acción les cambia algo (no re-eliminar ni re-restaurar)
  const onlyApplicable = {
    activate: isNull(users.deletedAt),
    deactivate: isNull(users.deletedAt),
    delete: isNull(users.deletedAt),
    restore: isNotNull(users.deletedAt),
  }[action]

  const result = await db
    .update(users)
    .set({ ...values, updatedAt: now })
    .where(and(inArray(users.id, ids), onlyApplicable))

  return NextResponse.json({ affected: result.changes, skipped })
}

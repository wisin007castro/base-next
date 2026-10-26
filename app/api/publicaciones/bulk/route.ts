import { NextRequest, NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { bulkPublicacionesSchema } from '@/lib/api/schemas/publicacion.schema'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// POST /api/publicaciones/bulk  { action: 'delete', ids }
export async function POST(req: NextRequest) {
  const guard = await requirePermission('publicaciones.delete')
  if (isGuardError(guard)) return guard

  const parsed = bulkPublicacionesSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const result = await db.delete(publicaciones).where(inArray(publicaciones.id, parsed.data.ids))
    return NextResponse.json({ affected: result.changes, skipped: [] })
  } catch (err) {
    // Todo o nada: si alguno tiene dependientes, no se borra ninguno
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

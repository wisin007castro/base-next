import { NextRequest, NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { bulkCategoriasSchema } from '@/lib/api/schemas/categoria.schema'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// POST /api/categorias/bulk  { action: 'delete', ids }
export async function POST(req: NextRequest) {
  const guard = await requirePermission('categorias.delete')
  if (isGuardError(guard)) return guard

  const parsed = bulkCategoriasSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const result = await db.delete(categorias).where(inArray(categorias.id, parsed.data.ids))
    return NextResponse.json({ affected: result.changes, skipped: [] })
  } catch (err) {
    // Todo o nada: si alguno tiene dependientes, no se borra ninguno
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

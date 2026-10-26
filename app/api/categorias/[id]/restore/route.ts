import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { findCategoria, serializeCategoria, categoriaVisibleParents } from '@/lib/api/serializers/categoria.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeRestore } from '@/lib/api/dependents'

// POST /api/categorias/:id/restore → deshace el soft delete (y el de sus hijos en cascada)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('categorias.delete')
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const [row] = Number.isInteger(id)
    ? await db
        .select({ id: categorias.id, deletedAt: categorias.deletedAt })
        .from(categorias)
        .where(and(eq(categorias.id, id), isNotNull(categorias.deletedAt)))
    : []
  if (!row) return NextResponse.json({ message: 'Categoría no encontrada entre los eliminados' }, { status: 404 })

  // Un padre obligatorio eliminado: restaurarlo primero (si no, el registro seguiría oculto)
  const [visible] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(eq(categorias.id, id), ...categoriaVisibleParents))
  if (!visible) {
    return NextResponse.json({ message: 'Restaura primero el registro relacionado del que depende' }, { status: 422 })
  }

  try {
    db.transaction(tx => {
      tx.update(categorias)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(categorias.id, id))
        .run()
      cascadeRestore(tx, 'categorias', [id], row.deletedAt!)
    })
  } catch (err) {
    // Otro registro activo tomó su valor único mientras estaba eliminado
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
  return NextResponse.json(await serializeCategoria((await findCategoria(id))!))
}

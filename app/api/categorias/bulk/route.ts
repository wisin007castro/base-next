import { NextRequest, NextResponse } from 'next/server'
import { and, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { bulkCategoriasSchema } from '@/lib/api/schemas/categoria.schema'
import { categoriaVisibleParents } from '@/lib/api/serializers/categoria.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeRestore, cascadeSoftDelete, restrictMessage } from '@/lib/api/dependents'

// POST /api/categorias/bulk  { action: 'delete' | 'restore' | 'force_delete', ids }
// Cada acción es todo o nada (transacción)
export async function POST(req: NextRequest) {
  const parsed = bulkCategoriasSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  const { action } = parsed.data
  const guard = await requirePermission(action === 'force_delete' ? 'categorias.force_delete' : 'categorias.delete')
  if (isGuardError(guard)) return guard

  const ids = [...new Set(parsed.data.ids)]

  try {
    if (action === 'force_delete') {
      const result = await db
        .delete(categorias)
        .where(and(inArray(categorias.id, ids), isNotNull(categorias.deletedAt)))
      return NextResponse.json({ affected: result.changes, skipped: [] })
    }

    if (action === 'delete') {
      const result = db.transaction(tx => {
        const active = tx
          .select({ id: categorias.id })
          .from(categorias)
          .where(and(inArray(categorias.id, ids), isNull(categorias.deletedAt)))
          .all()
          .map(r => r.id)
        const blocked = active.length ? restrictMessage(tx, 'categorias', active) : null
        if (blocked) return { blocked }
        const now = new Date().toISOString()
        if (active.length) {
          tx.update(categorias).set({ deletedAt: now, updatedAt: now }).where(inArray(categorias.id, active)).run()
          cascadeSoftDelete(tx, 'categorias', active, now)
        }
        return { affected: active.length }
      })
      if ('blocked' in result) return NextResponse.json({ message: result.blocked }, { status: 409 })
      return NextResponse.json({ affected: result.affected, skipped: [] })
    }

    // restore: solo eliminados cuyos padres obligatorios estén activos
    const deleted = await db
      .select({ id: categorias.id, deletedAt: categorias.deletedAt })
      .from(categorias)
      .where(and(inArray(categorias.id, ids), isNotNull(categorias.deletedAt)))
    const restorable = new Set(
      deleted.length
        ? (
            await db
              .select({ id: categorias.id })
              .from(categorias)
              .where(
                and(
                  inArray(
                    categorias.id,
                    deleted.map(r => r.id),
                  ),
                  ...categoriaVisibleParents,
                ),
              )
          ).map(r => r.id)
        : [],
    )
    const skipped = deleted.filter(r => !restorable.has(r.id)).map(r => r.id)
    db.transaction(tx => {
      for (const row of deleted.filter(r => restorable.has(r.id))) {
        tx.update(categorias)
          .set({ deletedAt: null, updatedAt: new Date().toISOString() })
          .where(inArray(categorias.id, [row.id]))
          .run()
        cascadeRestore(tx, 'categorias', [row.id], row.deletedAt!)
      }
    })
    return NextResponse.json({ affected: restorable.size, skipped })
  } catch (err) {
    const res = foreignKeyViolationResponse(err) ?? uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

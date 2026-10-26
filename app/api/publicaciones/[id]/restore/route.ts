import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import {
  findPublicacion,
  serializePublicacion,
  publicacionVisibleParents,
} from '@/lib/api/serializers/publicacion.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeRestore } from '@/lib/api/dependents'

// POST /api/publicaciones/:id/restore → deshace el soft delete (y el de sus hijos en cascada)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('publicaciones.delete')
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const [row] = Number.isInteger(id)
    ? await db
        .select({ id: publicaciones.id, deletedAt: publicaciones.deletedAt })
        .from(publicaciones)
        .where(and(eq(publicaciones.id, id), isNotNull(publicaciones.deletedAt)))
    : []
  if (!row) return NextResponse.json({ message: 'Publicación no encontrada entre los eliminados' }, { status: 404 })

  // Un padre obligatorio eliminado: restaurarlo primero (si no, el registro seguiría oculto)
  const [visible] = await db
    .select({ id: publicaciones.id })
    .from(publicaciones)
    .where(and(eq(publicaciones.id, id), ...publicacionVisibleParents))
  if (!visible) {
    return NextResponse.json({ message: 'Restaura primero el registro relacionado del que depende' }, { status: 422 })
  }

  try {
    db.transaction(tx => {
      tx.update(publicaciones)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(publicaciones.id, id))
        .run()
      cascadeRestore(tx, 'publicaciones', [id], row.deletedAt!)
    })
  } catch (err) {
    // Otro registro activo tomó su valor único mientras estaba eliminado
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
  return NextResponse.json(await serializePublicacion((await findPublicacion(id))!))
}

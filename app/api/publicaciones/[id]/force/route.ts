import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// DELETE /api/publicaciones/:id/force → borrado definitivo, solo de eliminados (dos pasos).
// Las FK aplican su política: cascade borra hijos, restrict lo impide (409), set null los desvincula.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('publicaciones.force_delete')
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  try {
    const deleted = Number.isInteger(id)
      ? await db
          .delete(publicaciones)
          .where(and(eq(publicaciones.id, id), isNotNull(publicaciones.deletedAt)))
          .returning({ id: publicaciones.id })
      : []
    if (!deleted.length) {
      return NextResponse.json(
        { message: 'Elimina primero el registro; luego podrás borrarlo definitivamente' },
        { status: 409 },
      )
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

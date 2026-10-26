import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { updatePublicacionSchema } from '@/lib/api/schemas/publicacion.schema'
import {
  findPublicacion,
  serializePublicacion,
  toPublicacionRow,
  syncPublicacionMany,
  validatePublicacionRefs,
} from '@/lib/api/serializers/publicacion.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeSoftDelete, restrictMessage } from '@/lib/api/dependents'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Publicación no encontrada' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/publicaciones/:id  (?with_trashed=true incluye eliminados)
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id
    ? await findPublicacion(id, { withTrashed: req.nextUrl.searchParams.get('with_trashed') === 'true' })
    : undefined
  if (!item) return notFound()
  return NextResponse.json(await serializePublicacion(item))
}

// PATCH /api/publicaciones/:id  (no se editan eliminados: restaurar primero)
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = updatePublicacionSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  const refErrors = await validatePublicacionRefs(parsed.data)
  if (Object.keys(refErrors).length) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: refErrors } },
      { status: 422 },
    )
  }

  try {
    const updated = db.transaction(tx => {
      const rows = tx
        .update(publicaciones)
        .set({ ...toPublicacionRow(parsed.data), updatedAt: new Date().toISOString() })
        .where(and(eq(publicaciones.id, id), isNull(publicaciones.deletedAt)))
        .returning({ id: publicaciones.id })
        .all()
      if (rows.length) syncPublicacionMany(tx, id, parsed.data)
      return rows.length > 0
    })
    if (!updated) return notFound()
    return NextResponse.json(await serializePublicacion((await findPublicacion(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/publicaciones/:id  → soft delete (POST /restore lo deshace, DELETE /force lo borra)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  // Soft delete: comprueba dependientes (restrict) y propaga a los de política cascade
  const result = db.transaction(tx => {
    const [row] = tx
      .select({ id: publicaciones.id })
      .from(publicaciones)
      .where(and(eq(publicaciones.id, id), isNull(publicaciones.deletedAt)))
      .all()
    if (!row) return { status: 404 as const }
    const blocked = restrictMessage(tx, 'publicaciones', [id])
    if (blocked) return { status: 409 as const, message: blocked }
    const now = new Date().toISOString()
    tx.update(publicaciones).set({ deletedAt: now, updatedAt: now }).where(eq(publicaciones.id, id)).run()
    cascadeSoftDelete(tx, 'publicaciones', [id], now)
    return { status: 204 as const }
  })
  if (result.status === 404) return notFound()
  if (result.status === 409) return NextResponse.json({ message: result.message }, { status: 409 })
  return new NextResponse(null, { status: 204 })
}

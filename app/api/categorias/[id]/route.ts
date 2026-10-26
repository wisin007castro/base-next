import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { updateCategoriaSchema } from '@/lib/api/schemas/categoria.schema'
import { findCategoria, serializeCategoria, toCategoriaRow } from '@/lib/api/serializers/categoria.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeSoftDelete, restrictMessage } from '@/lib/api/dependents'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/categorias/:id  (?with_trashed=true incluye eliminados)
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id
    ? await findCategoria(id, { withTrashed: req.nextUrl.searchParams.get('with_trashed') === 'true' })
    : undefined
  if (!item) return notFound()
  return NextResponse.json(await serializeCategoria(item))
}

// PATCH /api/categorias/:id  (no se editan eliminados: restaurar primero)
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = updateCategoriaSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  try {
    const updated = db.transaction(tx => {
      const rows = tx
        .update(categorias)
        .set({ ...toCategoriaRow(parsed.data), updatedAt: new Date().toISOString() })
        .where(and(eq(categorias.id, id), isNull(categorias.deletedAt)))
        .returning({ id: categorias.id })
        .all()
      return rows.length > 0
    })
    if (!updated) return notFound()
    return NextResponse.json(await serializeCategoria((await findCategoria(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/categorias/:id  → soft delete (POST /restore lo deshace, DELETE /force lo borra)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  // Soft delete: comprueba dependientes (restrict) y propaga a los de política cascade
  const result = db.transaction(tx => {
    const [row] = tx
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.id, id), isNull(categorias.deletedAt)))
      .all()
    if (!row) return { status: 404 as const }
    const blocked = restrictMessage(tx, 'categorias', [id])
    if (blocked) return { status: 409 as const, message: blocked }
    const now = new Date().toISOString()
    tx.update(categorias).set({ deletedAt: now, updatedAt: now }).where(eq(categorias.id, id)).run()
    cascadeSoftDelete(tx, 'categorias', [id], now)
    return { status: 204 as const }
  })
  if (result.status === 404) return notFound()
  if (result.status === 409) return NextResponse.json({ message: result.message }, { status: 409 })
  return new NextResponse(null, { status: 204 })
}

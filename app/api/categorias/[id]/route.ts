import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { updateCategoriaSchema } from '@/lib/api/schemas/categoria.schema'
import { findCategoria, serializeCategoria, toCategoriaRow } from '@/lib/api/serializers/categoria.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/categorias/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id ? await findCategoria(id) : undefined
  if (!item) return notFound()
  return NextResponse.json(serializeCategoria(item))
}

// PATCH /api/categorias/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = updateCategoriaSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const updated = await db
      .update(categorias)
      .set({ ...toCategoriaRow(parsed.data), updatedAt: new Date().toISOString() })
      .where(eq(categorias.id, id))
      .returning({ id: categorias.id })
    if (!updated.length) return notFound()
    return NextResponse.json(serializeCategoria((await findCategoria(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/categorias/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('categorias.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  try {
    const deleted = await db.delete(categorias).where(eq(categorias.id, id)).returning({ id: categorias.id })
    if (!deleted.length) return notFound()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { etiquetas } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { updateEtiquetaSchema } from '@/lib/api/schemas/etiqueta.schema'
import { findEtiqueta, serializeEtiqueta, toEtiquetaRow } from '@/lib/api/serializers/etiqueta.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Etiqueta no encontrada' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/etiquetas/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('etiquetas.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id ? await findEtiqueta(id) : undefined
  if (!item) return notFound()
  return NextResponse.json(await serializeEtiqueta(item))
}

// PATCH /api/etiquetas/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('etiquetas.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = updateEtiquetaSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  try {
    const updated = db.transaction(tx => {
      const rows = tx
        .update(etiquetas)
        .set({ ...toEtiquetaRow(parsed.data), updatedAt: new Date().toISOString() })
        .where(and(eq(etiquetas.id, id)))
        .returning({ id: etiquetas.id })
        .all()
      return rows.length > 0
    })
    if (!updated) return notFound()
    return NextResponse.json(await serializeEtiqueta((await findEtiqueta(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/etiquetas/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('etiquetas.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  try {
    const deleted = await db.delete(etiquetas).where(eq(etiquetas.id, id)).returning({ id: etiquetas.id })
    if (!deleted.length) return notFound()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { updatePublicacionSchema } from '@/lib/api/schemas/publicacion.schema'
import {
  findPublicacion,
  serializePublicacion,
  toPublicacionRow,
  validatePublicacionRefs,
} from '@/lib/api/serializers/publicacion.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Publicación no encontrada' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/publicaciones/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id ? await findPublicacion(id) : undefined
  if (!item) return notFound()
  return NextResponse.json(serializePublicacion(item))
}

// PATCH /api/publicaciones/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = updatePublicacionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const refErrors = await validatePublicacionRefs(parsed.data)
  if (Object.keys(refErrors).length) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: refErrors } },
      { status: 422 },
    )
  }

  try {
    const updated = await db
      .update(publicaciones)
      .set({ ...toPublicacionRow(parsed.data), updatedAt: new Date().toISOString() })
      .where(eq(publicaciones.id, id))
      .returning({ id: publicaciones.id })
    if (!updated.length) return notFound()
    return NextResponse.json(serializePublicacion((await findPublicacion(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/publicaciones/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('publicaciones.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  try {
    const deleted = await db.delete(publicaciones).where(eq(publicaciones.id, id)).returning({ id: publicaciones.id })
    if (!deleted.length) return notFound()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}

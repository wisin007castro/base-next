import { NextRequest, NextResponse } from 'next/server'
import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { createPublicacionSchema } from '@/lib/api/schemas/publicacion.schema'
import {
  findPublicacion,
  publicacionRefSortColumns,
  selectPublicaciones,
  serializePublicacion,
  toPublicacionRow,
  validatePublicacionRefs,
} from '@/lib/api/serializers/publicacion.serializer'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { uniqueViolationResponse } from '@/lib/api/db-errors'

/** Columnas por las que se puede ordenar: `?sort=campo` / `?sort=-campo` */
const SORTABLE = {
  id: publicaciones.id,
  created_at: publicaciones.createdAt,
  titulo: publicaciones.titulo,
  resumen: publicaciones.resumen,
  publicada: publicaciones.publicada,
  fecha_publicacion: publicaciones.fechaPublicacion,
  // Relaciones: se ordena por la etiqueta del registro relacionado
  ...publicacionRefSortColumns,
}

// GET /api/publicaciones
export async function GET(req: NextRequest) {
  const guard = await requirePermission('publicaciones.view')
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams)
  const conditions: SQL[] = []

  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(
      or(like(publicaciones.titulo, term), like(publicaciones.resumen, term), like(publicaciones.contenido, term))!,
    )
  }

  const categoriaId = Number(searchParams.get('categoria_id'))
  if (Number.isInteger(categoriaId) && categoriaId > 0) conditions.push(eq(publicaciones.categoriaId, categoriaId))

  const publicada = searchParams.get('publicada')
  if (publicada === 'true' || publicada === 'false') conditions.push(eq(publicaciones.publicada, publicada === 'true'))

  const where = conditions.length ? and(...conditions) : undefined
  const [rows, [{ total }]] = await Promise.all([
    selectPublicaciones()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(publicaciones.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(publicaciones).where(where),
  ])

  return NextResponse.json(paginated(rows.map(serializePublicacion), total, pagination))
}

// POST /api/publicaciones
export async function POST(req: NextRequest) {
  const guard = await requirePermission('publicaciones.create')
  if (isGuardError(guard)) return guard

  const parsed = createPublicacionSchema.safeParse(await req.json())
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
    // createPublicacionSchema garantiza los campos obligatorios
    const values = {
      ...toPublicacionRow(parsed.data),
      // El autor es siempre quien crea el registro (no viene del body)
      autorId: Number(guard.user.id),
    } as typeof publicaciones.$inferInsert
    const [{ id }] = await db.insert(publicaciones).values(values).returning({ id: publicaciones.id })
    return NextResponse.json(serializePublicacion((await findPublicacion(id))!), { status: 201 })
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

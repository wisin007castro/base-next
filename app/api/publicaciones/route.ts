import { NextRequest, NextResponse } from 'next/server'
import { type SQL, and, count, desc, eq, inArray, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones, publicacionesEtiquetas } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { createPublicacionSchema } from '@/lib/api/schemas/publicacion.schema'
import {
  findPublicacion,
  publicacionActive,
  publicacionRefSortColumns,
  publicacionVisibleParents,
  selectPublicaciones,
  serializePublicacion,
  serializePublicaciones,
  toPublicacionRow,
  syncPublicacionMany,
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
  // `?with_trashed=true` incluye los eliminados (y los hijos de padres eliminados)
  const withTrashed = searchParams.get('with_trashed') === 'true'
  const conditions: (SQL | undefined)[] = withTrashed ? [] : [publicacionActive, ...publicacionVisibleParents]

  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(
      or(like(publicaciones.titulo, term), like(publicaciones.resumen, term), like(publicaciones.contenido, term)),
    )
  }

  const categoriaId = Number(searchParams.get('categoria_id'))
  if (Number.isInteger(categoriaId) && categoriaId > 0) conditions.push(eq(publicaciones.categoriaId, categoriaId))

  // Tiene la relación indicada: `?etiqueta_ids=3`
  const etiquetaIds = Number(searchParams.get('etiqueta_ids'))
  if (Number.isInteger(etiquetaIds) && etiquetaIds > 0) {
    conditions.push(
      inArray(
        publicaciones.id,
        db
          .select({ id: publicacionesEtiquetas.publicacionId })
          .from(publicacionesEtiquetas)
          .where(eq(publicacionesEtiquetas.etiquetaId, etiquetaIds)),
      ),
    )
  }

  const publicada = searchParams.get('publicada')
  if (publicada === 'true' || publicada === 'false') conditions.push(eq(publicaciones.publicada, publicada === 'true'))

  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    selectPublicaciones()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(publicaciones.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(publicaciones).where(where),
  ])

  return NextResponse.json(paginated(await serializePublicaciones(rows), total, pagination))
}

// POST /api/publicaciones
export async function POST(req: NextRequest) {
  const guard = await requirePermission('publicaciones.create')
  if (isGuardError(guard)) return guard

  const parsed = createPublicacionSchema.safeParse(await req.json())
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
    // createPublicacionSchema garantiza los campos obligatorios
    const values = {
      ...toPublicacionRow(parsed.data),
      // El autor es siempre quien crea el registro (no viene del body)
      autorId: Number(guard.user.id),
    } as typeof publicaciones.$inferInsert
    // Fila + relaciones N:M en una transacción: o se guarda todo o nada
    const id = db.transaction(tx => {
      const [{ id }] = tx.insert(publicaciones).values(values).returning({ id: publicaciones.id }).all()
      syncPublicacionMany(tx, id, parsed.data)
      return id
    })
    return NextResponse.json(await serializePublicacion((await findPublicacion(id))!), { status: 201 })
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

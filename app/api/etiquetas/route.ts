import { NextRequest, NextResponse } from 'next/server'
import { type SQL, and, count, desc, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { etiquetas } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { createEtiquetaSchema } from '@/lib/api/schemas/etiqueta.schema'
import {
  findEtiqueta,
  etiquetaRefSortColumns,
  etiquetaVisibleParents,
  selectEtiquetas,
  serializeEtiqueta,
  serializeEtiquetas,
  toEtiquetaRow,
} from '@/lib/api/serializers/etiqueta.serializer'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { uniqueViolationResponse } from '@/lib/api/db-errors'

/** Columnas por las que se puede ordenar: `?sort=campo` / `?sort=-campo` */
const SORTABLE = {
  id: etiquetas.id,
  created_at: etiquetas.createdAt,
  nombre: etiquetas.nombre,
  // Relaciones: se ordena por la etiqueta del registro relacionado
  ...etiquetaRefSortColumns,
}

// GET /api/etiquetas
export async function GET(req: NextRequest) {
  const guard = await requirePermission('etiquetas.view')
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams)
  const conditions: (SQL | undefined)[] = [...etiquetaVisibleParents]

  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(or(like(etiquetas.nombre, term)))
  }

  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    selectEtiquetas()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(etiquetas.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(etiquetas).where(where),
  ])

  return NextResponse.json(paginated(await serializeEtiquetas(rows), total, pagination))
}

// POST /api/etiquetas
export async function POST(req: NextRequest) {
  const guard = await requirePermission('etiquetas.create')
  if (isGuardError(guard)) return guard

  const parsed = createEtiquetaSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  try {
    // createEtiquetaSchema garantiza los campos obligatorios
    const values = {
      ...toEtiquetaRow(parsed.data),
    } as typeof etiquetas.$inferInsert
    // Fila + relaciones N:M en una transacción: o se guarda todo o nada
    const id = db.transaction(tx => {
      const [{ id }] = tx.insert(etiquetas).values(values).returning({ id: etiquetas.id }).all()
      return id
    })
    return NextResponse.json(await serializeEtiqueta((await findEtiqueta(id))!), { status: 201 })
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { type SQL, and, count, desc, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { createCategoriaSchema } from '@/lib/api/schemas/categoria.schema'
import {
  findCategoria,
  categoriaActive,
  categoriaRefSortColumns,
  categoriaVisibleParents,
  selectCategorias,
  serializeCategoria,
  serializeCategorias,
  toCategoriaRow,
} from '@/lib/api/serializers/categoria.serializer'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { uniqueViolationResponse } from '@/lib/api/db-errors'

/** Columnas por las que se puede ordenar: `?sort=campo` / `?sort=-campo` */
const SORTABLE = {
  id: categorias.id,
  created_at: categorias.createdAt,
  nombre: categorias.nombre,
  // Relaciones: se ordena por la etiqueta del registro relacionado
  ...categoriaRefSortColumns,
}

// GET /api/categorias
export async function GET(req: NextRequest) {
  const guard = await requirePermission('categorias.view')
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams)
  // `?with_trashed=true` incluye los eliminados (y los hijos de padres eliminados)
  const withTrashed = searchParams.get('with_trashed') === 'true'
  const conditions: (SQL | undefined)[] = withTrashed ? [] : [categoriaActive, ...categoriaVisibleParents]

  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(or(like(categorias.nombre, term), like(categorias.descripcion, term)))
  }

  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    selectCategorias()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(categorias.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(categorias).where(where),
  ])

  return NextResponse.json(paginated(await serializeCategorias(rows), total, pagination))
}

// POST /api/categorias
export async function POST(req: NextRequest) {
  const guard = await requirePermission('categorias.create')
  if (isGuardError(guard)) return guard

  const parsed = createCategoriaSchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })

  try {
    // createCategoriaSchema garantiza los campos obligatorios
    const values = {
      ...toCategoriaRow(parsed.data),
    } as typeof categorias.$inferInsert
    // Fila + relaciones N:M en una transacción: o se guarda todo o nada
    const id = db.transaction(tx => {
      const [{ id }] = tx.insert(categorias).values(values).returning({ id: categorias.id }).all()
      return id
    })
    return NextResponse.json(await serializeCategoria((await findCategoria(id))!), { status: 201 })
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

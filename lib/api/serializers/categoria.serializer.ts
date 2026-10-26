import { type SQL, and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import type { Categoria } from '@/lib/types/categoria.types'
import type { UpdateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

/** Columnas de cada relación por las que se puede ordenar el listado */
export const categoriaRefSortColumns = {}

/** No eliminado (soft delete) */
export const categoriaActive: SQL | undefined = isNull(categorias.deletedAt)

/**
 * Visibles: sin padres obligatorios eliminados (si se elimina la categoría, sus hijos se ocultan).
 * Con EXISTS en vez de join para poder usarlo también en el COUNT del listado.
 */
export const categoriaVisibleParents: SQL[] = []

/** SELECT base: la fila + la etiqueta de cada relación (listado, detalle y tras crear/editar) */
export const selectCategorias = () =>
  db
    .select({
      row: categorias,
    })
    .from(categorias)

type Selected = {
  row: typeof categorias.$inferSelect
}

/** Un registro visible con sus relaciones, o undefined (`withTrashed` incluye eliminados) */
export async function findCategoria(id: number, { withTrashed = false } = {}) {
  const [item] = await selectCategorias().where(
    and(eq(categorias.id, id), withTrashed ? undefined : categoriaActive, ...categoriaVisibleParents),
  )
  return item
}

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
function serializeOne(s: Selected): Categoria {
  const r = s.row
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,

    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }
}

/** Serializa filas */
export async function serializeCategorias(rows: Selected[]): Promise<Categoria[]> {
  return rows.map(r => serializeOne(r))
}

export const serializeCategoria = async (row: Selected) => (await serializeCategorias([row]))[0]

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function toCategoriaRow(input: UpdateCategoriaInput): Partial<typeof categorias.$inferInsert> {
  const row: Partial<typeof categorias.$inferInsert> = {}
  if (input.nombre !== undefined) row.nombre = input.nombre
  if (input.descripcion !== undefined) row.descripcion = input.descripcion
  return row
}

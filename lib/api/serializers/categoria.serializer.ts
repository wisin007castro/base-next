import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import type { Categoria } from '@/lib/types/categoria.types'
import type { UpdateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

/** Columnas de cada relación por las que se puede ordenar el listado */
export const categoriaRefSortColumns = {}

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

/** Un registro con sus relaciones, o undefined */
export async function findCategoria(id: number) {
  const [item] = await selectCategorias().where(eq(categorias.id, id))
  return item
}

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
export function serializeCategoria(s: Selected): Categoria {
  const r = s.row
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,

    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function toCategoriaRow(input: UpdateCategoriaInput): Partial<typeof categorias.$inferInsert> {
  const row: Partial<typeof categorias.$inferInsert> = {}
  if (input.nombre !== undefined) row.nombre = input.nombre
  if (input.descripcion !== undefined) row.descripcion = input.descripcion
  return row
}

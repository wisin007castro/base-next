import { type SQL, and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { etiquetas } from '@/lib/db/schema'
import type { Etiqueta } from '@/lib/types/etiqueta.types'
import type { UpdateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'

/** Columnas de cada relación por las que se puede ordenar el listado */
export const etiquetaRefSortColumns = {}

/** No eliminado (soft delete): este módulo no tiene soft delete */
export const etiquetaActive: SQL | undefined = undefined

/**
 * Visibles: sin padres obligatorios eliminados (si se elimina la categoría, sus hijos se ocultan).
 * Con EXISTS en vez de join para poder usarlo también en el COUNT del listado.
 */
export const etiquetaVisibleParents: SQL[] = []

/** SELECT base: la fila + la etiqueta de cada relación (listado, detalle y tras crear/editar) */
export const selectEtiquetas = () =>
  db
    .select({
      row: etiquetas,
    })
    .from(etiquetas)

type Selected = {
  row: typeof etiquetas.$inferSelect
}

/** Un registro visible con sus relaciones, o undefined */
export async function findEtiqueta(id: number) {
  const [item] = await selectEtiquetas().where(and(eq(etiquetas.id, id), ...etiquetaVisibleParents))
  return item
}

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
function serializeOne(s: Selected): Etiqueta {
  const r = s.row
  return {
    id: r.id,
    nombre: r.nombre,

    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

/** Serializa filas */
export async function serializeEtiquetas(rows: Selected[]): Promise<Etiqueta[]> {
  return rows.map(r => serializeOne(r))
}

export const serializeEtiqueta = async (row: Selected) => (await serializeEtiquetas([row]))[0]

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function toEtiquetaRow(input: UpdateEtiquetaInput): Partial<typeof etiquetas.$inferInsert> {
  const row: Partial<typeof etiquetas.$inferInsert> = {}
  if (input.nombre !== undefined) row.nombre = input.nombre
  return row
}

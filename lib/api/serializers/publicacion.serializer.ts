import { type SQL, and, asc, eq, exists, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { publicaciones, categorias, users, etiquetas, publicacionesEtiquetas } from '@/lib/db/schema'
import type { Tx } from '@/lib/api/dependents'
import type { Publicacion, RefLabel } from '@/lib/types/publicacion.types'
import type { UpdatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

const categoriaRef = alias(categorias, 'categoria_ref')
const autorRef = alias(users, 'autor_ref')

/** Columnas de cada relación por las que se puede ordenar el listado */
export const publicacionRefSortColumns = {
  categoria_id: categoriaRef.nombre,
  autor_id: autorRef.username,
}

/** No eliminado (soft delete) */
export const publicacionActive: SQL | undefined = isNull(publicaciones.deletedAt)

/**
 * Visibles: sin padres obligatorios eliminados (si se elimina la categoría, sus hijos se ocultan).
 * Con EXISTS en vez de join para poder usarlo también en el COUNT del listado.
 */
export const publicacionVisibleParents: SQL[] = [
  exists(
    db
      .select({ one: sql`1` })
      .from(categorias)
      .where(and(eq(categorias.id, publicaciones.categoriaId), isNull(categorias.deletedAt))),
  ),
  exists(
    db
      .select({ one: sql`1` })
      .from(users)
      .where(and(eq(users.id, publicaciones.autorId), isNull(users.deletedAt))),
  ),
]

/** SELECT base: la fila + la etiqueta de cada relación (listado, detalle y tras crear/editar) */
export const selectPublicaciones = () =>
  db
    .select({
      row: publicaciones,
      categoria_label: categoriaRef.nombre,
      autor_label: autorRef.username,
    })
    .from(publicaciones)
    .leftJoin(categoriaRef, eq(publicaciones.categoriaId, categoriaRef.id))
    .leftJoin(autorRef, eq(publicaciones.autorId, autorRef.id))

type Selected = {
  row: typeof publicaciones.$inferSelect
  categoria_label: string | null
  autor_label: string | null
}

/** Un registro visible con sus relaciones, o undefined (`withTrashed` incluye eliminados) */
export async function findPublicacion(id: number, { withTrashed = false } = {}) {
  const [item] = await selectPublicaciones().where(
    and(eq(publicaciones.id, id), withTrashed ? undefined : publicacionActive, ...publicacionVisibleParents),
  )
  return item
}

/** Relaciones N:M de varias filas en una consulta por campo (sin N+1) */
async function loadMany(ids: number[]) {
  const etiquetaIds = new Map<number, RefLabel[]>()
  if (ids.length) {
    const rows = await db
      .select({ parentId: publicacionesEtiquetas.publicacionId, id: etiquetas.id, label: etiquetas.nombre })
      .from(publicacionesEtiquetas)
      .innerJoin(etiquetas, eq(publicacionesEtiquetas.etiquetaId, etiquetas.id))
      .where(and(inArray(publicacionesEtiquetas.publicacionId, ids)))
      .orderBy(asc(etiquetas.nombre))
    for (const { parentId, ...ref } of rows) etiquetaIds.set(parentId, [...(etiquetaIds.get(parentId) ?? []), ref])
  }
  return { etiquetaIds }
}

type ManyMaps = Awaited<ReturnType<typeof loadMany>>

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
function serializeOne(s: Selected, many: ManyMaps): Publicacion {
  const r = s.row
  return {
    id: r.id,
    titulo: r.titulo,
    resumen: r.resumen,
    contenido: r.contenido,
    categoria_id: r.categoriaId,
    publicada: r.publicada,
    fecha_publicacion: r.fechaPublicacion,
    autor_id: r.autorId,
    etiqueta_ids: (many.etiquetaIds.get(r.id) ?? []).map(e => e.id),
    categoria: { id: r.categoriaId, label: s.categoria_label ?? `#${r.categoriaId}` },
    autor: { id: r.autorId, label: s.autor_label ?? `#${r.autorId}` },
    etiquetas: many.etiquetaIds.get(r.id) ?? [],
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }
}

/** Serializa filas (carga las relaciones N:M en una consulta por campo) */
export async function serializePublicaciones(rows: Selected[]): Promise<Publicacion[]> {
  const many = await loadMany(rows.map(r => r.row.id))
  return rows.map(r => serializeOne(r, many))
}

export const serializePublicacion = async (row: Selected) => (await serializePublicaciones([row]))[0]

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function toPublicacionRow(input: UpdatePublicacionInput): Partial<typeof publicaciones.$inferInsert> {
  const row: Partial<typeof publicaciones.$inferInsert> = {}
  if (input.titulo !== undefined) row.titulo = input.titulo
  if (input.resumen !== undefined) row.resumen = input.resumen
  if (input.contenido !== undefined) row.contenido = input.contenido
  if (input.categoria_id !== undefined) row.categoriaId = input.categoria_id
  if (input.publicada !== undefined) row.publicada = input.publicada
  if (input.fecha_publicacion !== undefined) row.fechaPublicacion = input.fecha_publicacion
  return row
}

/** Reemplaza las relaciones N:M presentes en el body (dentro de la transacción del create/update) */
export function syncPublicacionMany(tx: Tx, id: number, input: UpdatePublicacionInput) {
  if (input.etiqueta_ids !== undefined) {
    tx.delete(publicacionesEtiquetas).where(eq(publicacionesEtiquetas.publicacionId, id)).run()
    const ids = [...new Set(input.etiqueta_ids)]
    if (ids.length)
      tx.insert(publicacionesEtiquetas)
        .values(ids.map(etiquetaId => ({ publicacionId: id, etiquetaId })))
        .run()
  }
}

/** Comprueba que existan (y no estén eliminados) los registros referenciados → errores por campo (422) */
export async function validatePublicacionRefs(input: UpdatePublicacionInput) {
  const errors: Record<string, string[]> = {}
  if (input.categoria_id != null) {
    const [found] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.id, input.categoria_id), isNull(categorias.deletedAt)))
    if (!found) errors.categoria_id = ['El registro seleccionado no existe']
  }
  if (input.etiqueta_ids?.length) {
    const ids = [...new Set(input.etiqueta_ids)]
    const found = await db
      .select({ id: etiquetas.id })
      .from(etiquetas)
      .where(and(inArray(etiquetas.id, ids)))
    if (found.length !== ids.length) errors.etiqueta_ids = ['Alguno de los registros seleccionados no existe']
  }
  return errors
}

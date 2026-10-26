import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { publicaciones, categorias, users } from '@/lib/db/schema'
import type { Publicacion } from '@/lib/types/publicacion.types'
import type { UpdatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

const categoriaRef = alias(categorias, 'categoria_ref')
const autorRef = alias(users, 'autor_ref')

/** Columnas de cada relación por las que se puede ordenar el listado */
export const publicacionRefSortColumns = {
  categoria_id: categoriaRef.nombre,
  autor_id: autorRef.username,
}

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

/** Un registro con sus relaciones, o undefined */
export async function findPublicacion(id: number) {
  const [item] = await selectPublicaciones().where(eq(publicaciones.id, id))
  return item
}

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
export function serializePublicacion(s: Selected): Publicacion {
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
    categoria: { id: r.categoriaId, label: s.categoria_label ?? `#${r.categoriaId}` },
    autor: { id: r.autorId, label: s.autor_label ?? `#${r.autorId}` },
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

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

/** Comprueba que existan los registros referenciados → errores por campo (422) */
export async function validatePublicacionRefs(input: UpdatePublicacionInput) {
  const errors: Record<string, string[]> = {}
  if (input.categoria_id != null) {
    const [found] = await db.select({ id: categorias.id }).from(categorias).where(eq(categorias.id, input.categoria_id))
    if (!found) errors.categoria_id = ['El registro seleccionado no existe']
  }
  return errors
}

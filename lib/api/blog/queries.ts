import { and, asc, desc, eq, getTableName, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { categorias, comentarios, etiquetas, publicaciones, publicacionesEtiquetas, users } from '@/lib/db/schema'
import type { GuardSession } from '@/lib/api/api-guard'
import { publicacionActive, publicacionVisibleParents } from '@/lib/api/serializers/publicacion.serializer'
import type { RefLabel } from '@/lib/types/publicacion.types'
import type { BlogPost, Comentario, VotoValor } from '@/lib/types/blog.types'

const categoriaRef = alias(categorias, 'categoria_ref')
const autorRef = alias(users, 'autor_ref')

/**
 * Visible en el blog: publicada, no eliminada y con categoría y autor activos.
 * Reutiliza las condiciones del módulo generado (soft delete + padres eliminados), que usan
 * EXISTS: valen también para el COUNT del listado.
 */
export const isVisible = and(eq(publicaciones.publicada, true), publicacionActive, ...publicacionVisibleParents)!

/** Comentarios visibles: de autores activos */
export const comentarioVisible = isNull(users.deletedAt)

// Agregados por publicación como subconsultas correlacionadas (una sola query por página).
// Comentarios y votos de usuarios eliminados no cuentan.
// `postId` va calificado a mano: en un SELECT de una sola tabla Drizzle escribe solo "id", y dentro
// de la subconsulta "id" se resolvía como users.id (el JOIN) → puntaje 0 tras votar.
const postId = sql`${sql.identifier(getTableName(publicaciones))}.${sql.identifier('id')}`
const comentariosCount = sql<number>`(select count(*) from comentarios c join users u on u.id = c.autor_id where c.publicacion_id = ${postId} and u.deleted_at is null)`
const puntaje = sql<number>`coalesce((select sum(v.valor) from votos v join users u on u.id = v.user_id where v.publicacion_id = ${postId} and u.deleted_at is null), 0)`
const miVoto = (userId: number) =>
  sql<number>`coalesce((select v.valor from votos v where v.publicacion_id = ${postId} and v.user_id = ${userId}), 0)`

export const blogOrder = {
  recientes: [
    desc(sql`coalesce(${publicaciones.fechaPublicacion}, ${publicaciones.createdAt})`),
    desc(publicaciones.id),
  ],
  populares: [desc(puntaje), desc(comentariosCount), desc(publicaciones.id)],
}

/** SELECT de publicaciones con categoría, autor, nº de comentarios, puntaje y el voto del usuario */
export const selectBlogPosts = (userId: number) =>
  db
    .select({
      row: publicaciones,
      categoria_label: categoriaRef.nombre,
      autor_label: autorRef.username,
      comentarios_count: comentariosCount.mapWith(Number),
      puntaje: puntaje.mapWith(Number),
      mi_voto: miVoto(userId).mapWith(Number),
    })
    .from(publicaciones)
    .innerJoin(categoriaRef, eq(publicaciones.categoriaId, categoriaRef.id))
    .innerJoin(autorRef, eq(publicaciones.autorId, autorRef.id))

type BlogRow = Awaited<ReturnType<ReturnType<typeof selectBlogPosts>['execute']>>[number]

/** Etiquetas de varias publicaciones en una sola consulta */
async function loadEtiquetas(ids: number[]) {
  const map = new Map<number, RefLabel[]>()
  if (!ids.length) return map
  const rows = await db
    .select({ postId: publicacionesEtiquetas.publicacionId, id: etiquetas.id, label: etiquetas.nombre })
    .from(publicacionesEtiquetas)
    .innerJoin(etiquetas, eq(publicacionesEtiquetas.etiquetaId, etiquetas.id))
    .where(inArray(publicacionesEtiquetas.publicacionId, ids))
    .orderBy(asc(etiquetas.nombre))
  for (const { postId, ...tag } of rows) map.set(postId, [...(map.get(postId) ?? []), tag])
  return map
}

export async function serializeBlogPosts(rows: BlogRow[]): Promise<BlogPost[]> {
  const tags = await loadEtiquetas(rows.map(r => r.row.id))
  return rows.map(r => serializeOne(r, tags.get(r.row.id) ?? []))
}

export const serializeBlogPost = async (row: BlogRow) => (await serializeBlogPosts([row]))[0]

function serializeOne(s: BlogRow, etiquetas: RefLabel[]): BlogPost {
  const r = s.row
  return {
    id: r.id,
    titulo: r.titulo,
    resumen: r.resumen,
    contenido: r.contenido,
    fecha_publicacion: r.fechaPublicacion,
    created_at: r.createdAt,
    categoria: { id: r.categoriaId, label: s.categoria_label },
    autor: { id: r.autorId, label: s.autor_label },
    etiquetas,
    comentarios_count: s.comentarios_count,
    puntaje: s.puntaje,
    mi_voto: Math.sign(s.mi_voto) as VotoValor,
  }
}

/** Una publicación publicada, o undefined */
export async function findBlogPost(id: number, userId: number) {
  const [post] = await selectBlogPosts(userId).where(and(eq(publicaciones.id, id), isVisible))
  return post
}

/** Moderación: el autor, admin o `publicaciones.edit` pueden borrar un comentario */
export const canModerate = (guard: GuardSession) =>
  guard.user.roles.includes('admin') || guard.user.permissions.includes('publicaciones.edit')

export const selectComentarios = () =>
  db
    .select({ row: comentarios, autor_label: users.username })
    .from(comentarios)
    .innerJoin(users, eq(comentarios.autorId, users.id))

export function serializeComentario(
  s: { row: typeof comentarios.$inferSelect; autor_label: string },
  guard: GuardSession,
): Comentario {
  return {
    id: s.row.id,
    contenido: s.row.contenido,
    created_at: s.row.createdAt,
    autor: { id: s.row.autorId, label: s.autor_label },
    puedo_eliminar: s.row.autorId === Number(guard.user.id) || canModerate(guard),
  }
}

/** Puntaje actual y voto del usuario (tras votar) */
export async function votoResumen(publicacionId: number, userId: number) {
  const [r] = await db
    .select({ puntaje: puntaje.mapWith(Number), mi_voto: miVoto(userId).mapWith(Number) })
    .from(publicaciones)
    .where(eq(publicaciones.id, publicacionId))
  return { puntaje: r?.puntaje ?? 0, mi_voto: Math.sign(r?.mi_voto ?? 0) as VotoValor }
}

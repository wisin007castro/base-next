import { and, desc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { categorias, comentarios, publicaciones, users } from '@/lib/db/schema'
import type { GuardSession } from '@/lib/api/api-guard'
import type { BlogPost, Comentario, VotoValor } from '@/lib/types/blog.types'

const categoriaRef = alias(categorias, 'categoria_ref')
const autorRef = alias(users, 'autor_ref')

/** Solo lo publicado es visible en el blog */
export const isPublished = eq(publicaciones.publicada, true)

// Agregados por publicación como subconsultas correlacionadas (una sola query por página)
const comentariosCount = sql<number>`(select count(*) from comentarios c where c.publicacion_id = ${publicaciones.id})`
const puntaje = sql<number>`coalesce((select sum(v.valor) from votos v where v.publicacion_id = ${publicaciones.id}), 0)`
const miVoto = (userId: number) =>
  sql<number>`coalesce((select v.valor from votos v where v.publicacion_id = ${publicaciones.id} and v.user_id = ${userId}), 0)`

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

export function serializeBlogPost(s: BlogRow): BlogPost {
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
    comentarios_count: s.comentarios_count,
    puntaje: s.puntaje,
    mi_voto: Math.sign(s.mi_voto) as VotoValor,
  }
}

/** Una publicación publicada, o undefined */
export async function findBlogPost(id: number, userId: number) {
  const [post] = await selectBlogPosts(userId).where(and(eq(publicaciones.id, id), isPublished))
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

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import { categorias, comentarios, publicaciones, users } from '@/lib/db/schema'
import type { GuardSession } from '@/lib/api/api-guard'
import type { BlogPost, Comentario, VotoValor } from '@/lib/types/blog.types'

const categoriaRef = alias(categorias, 'categoria_ref')
const autorRef = alias(users, 'autor_ref')

/**
 * Visible en el blog: publicada y con autor activo (no eliminado).
 * Con EXISTS en vez de join para poder usarla también en el COUNT del listado.
 */
export const isVisible = and(
  eq(publicaciones.publicada, true),
  sql`exists (select 1 from users u where u.id = ${publicaciones.autorId} and u.deleted_at is null)`,
)!

/** Comentarios visibles: de autores activos */
export const comentarioVisible = isNull(users.deletedAt)

// Agregados por publicación como subconsultas correlacionadas (una sola query por página).
// Comentarios y votos de usuarios eliminados no cuentan.
const comentariosCount = sql<number>`(select count(*) from comentarios c join users u on u.id = c.autor_id where c.publicacion_id = ${publicaciones.id} and u.deleted_at is null)`
const puntaje = sql<number>`coalesce((select sum(v.valor) from votos v join users u on u.id = v.user_id where v.publicacion_id = ${publicaciones.id} and u.deleted_at is null), 0)`
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

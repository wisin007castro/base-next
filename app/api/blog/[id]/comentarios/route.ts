import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { comentarios } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { comentarioSchema } from '@/lib/api/schemas/blog.schema'
import { findBlogPost, selectComentarios, serializeComentario } from '@/lib/api/blog/queries'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: 'Publicación no encontrada' }, { status: 404 })

/** Id de la publicación si existe y está publicada (no se comenta en borradores) */
async function publishedPostId(params: Params['params'], userId: number) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return null
  return (await findBlogPost(id, userId)) ? id : null
}

// GET /api/blog/:id/comentarios
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const postId = await publishedPostId(params, Number(guard.user.id))
  if (!postId) return notFound()

  const rows = await selectComentarios()
    .where(eq(comentarios.publicacionId, postId))
    .orderBy(asc(comentarios.createdAt), asc(comentarios.id))
  return NextResponse.json(rows.map(r => serializeComentario(r, guard)))
}

// POST /api/blog/:id/comentarios  { contenido }
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)
  const postId = await publishedPostId(params, userId)
  if (!postId) return notFound()

  const parsed = comentarioSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const [{ id }] = await db
    .insert(comentarios)
    .values({ publicacionId: postId, autorId: userId, contenido: parsed.data.contenido })
    .returning({ id: comentarios.id })
  const [created] = await selectComentarios().where(eq(comentarios.id, id))
  return NextResponse.json(serializeComentario(created, guard), { status: 201 })
}

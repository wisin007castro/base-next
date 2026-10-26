import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { votos } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { votoSchema } from '@/lib/api/schemas/blog.schema'
import { findBlogPost, votoResumen } from '@/lib/api/blog/queries'

type Params = { params: Promise<{ id: string }> }

// PUT /api/blog/:id/voto  { valor: 1 | -1 | 0 } → { puntaje, mi_voto }
// Idempotente: un voto por usuario (PK compuesta); 0 lo elimina
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)
  const postId = Number((await params).id)
  if (!Number.isInteger(postId) || !(await findBlogPost(postId, userId))) {
    return NextResponse.json({ message: 'Publicación no encontrada' }, { status: 404 })
  }

  const parsed = votoSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { valor } = parsed.data
  if (valor === 0) {
    await db.delete(votos).where(and(eq(votos.publicacionId, postId), eq(votos.userId, userId)))
  } else {
    await db
      .insert(votos)
      .values({ publicacionId: postId, userId, valor })
      .onConflictDoUpdate({ target: [votos.publicacionId, votos.userId], set: { valor } })
  }

  return NextResponse.json(await votoResumen(postId, userId))
}

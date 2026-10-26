import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { comentarios } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { canModerate } from '@/lib/api/blog/queries'

type Params = { params: Promise<{ id: string; comentarioId: string }> }

// DELETE /api/blog/:id/comentarios/:comentarioId → el autor o un moderador
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const { id, comentarioId } = await params
  const [comentario] = await db
    .select()
    .from(comentarios)
    .where(and(eq(comentarios.id, Number(comentarioId)), eq(comentarios.publicacionId, Number(id))))
  if (!comentario) return NextResponse.json({ message: 'Comentario no encontrado' }, { status: 404 })

  if (comentario.autorId !== Number(guard.user.id) && !canModerate(guard)) {
    return NextResponse.json({ message: 'Solo puedes eliminar tus propios comentarios' }, { status: 403 })
  }

  await db.delete(comentarios).where(eq(comentarios.id, comentario.id))
  return new NextResponse(null, { status: 204 })
}

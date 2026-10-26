import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { findBlogPost, serializeBlogPost } from '@/lib/api/blog/queries'

type Params = { params: Promise<{ id: string }> }

// GET /api/blog/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const post = Number.isInteger(id) && id > 0 ? await findBlogPost(id, Number(guard.user.id)) : undefined
  if (!post) return NextResponse.json({ message: 'Publicación no encontrada' }, { status: 404 })
  return NextResponse.json(await serializeBlogPost(post))
}

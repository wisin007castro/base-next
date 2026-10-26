import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, like, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { paginated, parsePagination } from '@/lib/api/list-params'
import { blogOrder, isVisible, selectBlogPosts, serializeBlogPost } from '@/lib/api/blog/queries'

// GET /api/blog?search=&categoria_id=&orden=recientes|populares&page=
// Lectura del blog: cualquier usuario con sesión, solo publicaciones publicadas
export async function GET(req: NextRequest) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams, 9)
  const conditions: SQL[] = [isVisible]

  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(or(like(publicaciones.titulo, term), like(publicaciones.resumen, term))!)
  }
  const categoriaId = Number(searchParams.get('categoria_id'))
  if (Number.isInteger(categoriaId) && categoriaId > 0) conditions.push(eq(publicaciones.categoriaId, categoriaId))

  const orden = searchParams.get('orden') === 'populares' ? 'populares' : 'recientes'
  const where = and(...conditions)

  const [rows, [{ total }]] = await Promise.all([
    selectBlogPosts(Number(guard.user.id))
      .where(where)
      .orderBy(...blogOrder[orden])
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(publicaciones).where(where),
  ])

  return NextResponse.json(paginated(rows.map(serializeBlogPost), total, pagination))
}

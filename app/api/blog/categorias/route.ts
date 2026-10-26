import { NextResponse } from 'next/server'
import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias, publicaciones } from '@/lib/db/schema'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'

// GET /api/blog/categorias → categorías con publicaciones publicadas (filtro del blog).
// No usa /api/categorias/options porque ese exige `categorias.view` (permiso de administración).
export async function GET() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: categorias.id, label: categorias.nombre, total: count(publicaciones.id) })
    .from(categorias)
    .innerJoin(publicaciones, and(eq(publicaciones.categoriaId, categorias.id), eq(publicaciones.publicada, true)))
    .groupBy(categorias.id)
    .orderBy(asc(categorias.nombre))

  return NextResponse.json(rows)
}

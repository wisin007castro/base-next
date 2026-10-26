import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'

// GET /api/publicaciones/options → [{ value, label }] para selects de otros módulos
export async function GET() {
  const guard = await requirePermission('publicaciones.view')
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: publicaciones.id, label: publicaciones.titulo })
    .from(publicaciones)
    .orderBy(asc(publicaciones.titulo))
    .limit(500)

  return NextResponse.json(rows)
}

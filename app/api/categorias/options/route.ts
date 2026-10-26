import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'

// GET /api/categorias/options → [{ value, label }] para selects de otros módulos
export async function GET() {
  const guard = await requirePermission('categorias.view')
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: categorias.id, label: categorias.nombre })
    .from(categorias)
    .orderBy(asc(categorias.nombre))
    .limit(500)

  return NextResponse.json(rows)
}

import { NextResponse } from 'next/server'
import { and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorias } from '@/lib/db/schema'
import { requireAnyPermission, isGuardError } from '@/lib/api/api-guard'
import { optionsPermissions } from '@/lib/auth/module-permissions'
import { categoriaActive, categoriaVisibleParents } from '@/lib/api/serializers/categoria.serializer'

// GET /api/categorias/options → [{ value, label }] para selects de otros módulos.
// Lo puede leer quien ve el módulo o quien crea/edita un módulo que lo referencia.
export async function GET() {
  const guard = await requireAnyPermission(optionsPermissions('categorias'))
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: categorias.id, label: categorias.nombre })
    .from(categorias)
    .where(and(categoriaActive, ...categoriaVisibleParents))
    .orderBy(asc(categorias.nombre))
    .limit(500)

  return NextResponse.json(rows)
}

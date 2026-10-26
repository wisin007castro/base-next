import { NextResponse } from 'next/server'
import { and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { etiquetas } from '@/lib/db/schema'
import { requireAnyPermission, isGuardError } from '@/lib/api/api-guard'
import { optionsPermissions } from '@/lib/auth/module-permissions'
import { etiquetaActive, etiquetaVisibleParents } from '@/lib/api/serializers/etiqueta.serializer'

// GET /api/etiquetas/options → [{ value, label }] para selects de otros módulos.
// Lo puede leer quien ve el módulo o quien crea/edita un módulo que lo referencia.
export async function GET() {
  const guard = await requireAnyPermission(optionsPermissions('etiquetas'))
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: etiquetas.id, label: etiquetas.nombre })
    .from(etiquetas)
    .where(and(etiquetaActive, ...etiquetaVisibleParents))
    .orderBy(asc(etiquetas.nombre))
    .limit(500)

  return NextResponse.json(rows)
}

import { NextResponse } from 'next/server'
import { and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { publicaciones } from '@/lib/db/schema'
import { requireAnyPermission, isGuardError } from '@/lib/api/api-guard'
import { optionsPermissions } from '@/lib/auth/module-permissions'
import { publicacionActive, publicacionVisibleParents } from '@/lib/api/serializers/publicacion.serializer'

// GET /api/publicaciones/options → [{ value, label }] para selects de otros módulos.
// Lo puede leer quien ve el módulo o quien crea/edita un módulo que lo referencia.
export async function GET() {
  const guard = await requireAnyPermission(optionsPermissions('publicaciones'))
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: publicaciones.id, label: publicaciones.titulo })
    .from(publicaciones)
    .where(and(publicacionActive, ...publicacionVisibleParents))
    .orderBy(asc(publicaciones.titulo))
    .limit(500)

  return NextResponse.json(rows)
}

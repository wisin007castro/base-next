import { NextRequest, NextResponse } from 'next/server'
import { eq, like, isNull, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, userProfiles, userRoles as userRolesTable, roles as rolesTable } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Si contiene coma, comillas o saltos de línea, envolver en comillas y escapar comillas internas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// GET /api/users/export
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const search   = searchParams.get('search') ?? ''
  const role     = searchParams.get('role') ?? ''
  const isActive = searchParams.get('is_active')

  const conditions = []
  // Sin with_trashed: siempre excluir eliminados
  conditions.push(isNull(users.deletedAt))

  if (isActive !== null && isActive !== '') {
    conditions.push(eq(users.isActive, isActive === 'true'))
  }
  if (search) {
    conditions.push(like(users.email, `%${search}%`))
  }
  if (role) {
    const sub = db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
      .where(eq(rolesTable.name, role))
    conditions.push(inArray(users.id, sub))
  }

  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db.query.users.findMany({
    where,
    with: {
      profile: true,
      userRoles: { with: { role: true } },
    },
    orderBy: (u, { asc }) => [asc(u.id)],
  })

  // Encabezados CSV
  const headers = [
    'id',
    'username',
    'email',
    'estado',
    'verificado',
    'roles',
    'nombre_completo',
    'documento',
    'fecha_nacimiento',
    'telefono',
    'created_at',
    'last_login_at',
  ]

  const csvLines: string[] = [headers.join(',')]

  for (const row of rows) {
    const nombreCompleto = row.profile
      ? [row.profile.nombre, row.profile.primerApellido, row.profile.segundoApellido]
          .filter(Boolean)
          .join(' ')
      : ''

    const rolesStr = (row.userRoles ?? []).map((ur) => ur.role.name).join('; ')

    const fields = [
      escapeCsv(String(row.id)),
      escapeCsv(row.username),
      escapeCsv(row.email),
      escapeCsv(row.isActive ? 'activo' : 'inactivo'),
      escapeCsv(row.emailVerifiedAt ? 'sí' : 'no'),
      escapeCsv(rolesStr),
      escapeCsv(nombreCompleto),
      escapeCsv(row.profile?.numeroDocumento),
      escapeCsv(row.profile?.fechaNacimiento),
      escapeCsv(row.profile?.telefono),
      escapeCsv(row.createdAt),
      escapeCsv(row.lastLoginAt),
    ]

    csvLines.push(fields.join(','))
  }

  const csv = csvLines.join('\r\n')
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="usuarios-${today}.csv"`,
    },
  })
}

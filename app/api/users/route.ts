import { NextRequest, NextResponse } from 'next/server'
import { eq, like, isNull, and, count, desc, inArray } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, userProfiles, userRoles as userRolesTable, roles as rolesTable } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { syncRoles } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { createUserSchema } from '@/lib/api/schemas/user.schema'

const withRoles = { profile: true, userRoles: { with: { role: true } } } as const

// GET /api/users
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const page        = Number(searchParams.get('page') ?? 1)
  const perPage     = Number(searchParams.get('per_page') ?? 15)
  const search      = searchParams.get('search') ?? ''
  const role        = searchParams.get('role') ?? ''
  const isActive    = searchParams.get('is_active')
  const withTrashed = searchParams.get('with_trashed') === 'true'

  const offset = (page - 1) * perPage

  const conditions = []
  if (!withTrashed) conditions.push(isNull(users.deletedAt))
  if (isActive !== null && isActive !== '') {
    conditions.push(eq(users.isActive, isActive === 'true'))
  }
  if (search) conditions.push(like(users.email, `%${search}%`))
  if (role) {
    const sub = db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
      .where(eq(rolesTable.name, role))
    conditions.push(inArray(users.id, sub))
  }

  const where = conditions.length ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db.query.users.findMany({ where, with: withRoles, orderBy: desc(users.createdAt), limit: perPage, offset }),
    db.select({ total: count() }).from(users).where(where),
  ])

  const lastPage = Math.ceil(total / perPage)

  return NextResponse.json({
    data:         rows.map(serializeUser),
    current_page: page,
    per_page:     perPage,
    total,
    last_page:    lastPage,
    from:         offset + 1,
    to:           Math.min(offset + perPage, total),
    links: { first: null, last: null, prev: null, next: null },
  })
}

// POST /api/users
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const raw    = await req.json()
  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { username, email, password, role_ids, is_active, profile } = parsed.data
  const hashed = await bcrypt.hash(password, 12)
  const now    = new Date().toISOString()

  const [user] = await db
    .insert(users)
    .values({ username, email, password: hashed, isActive: is_active ?? true, createdAt: now, updatedAt: now })
    .returning()

  if (role_ids?.length) await syncRoles(user.id, role_ids)

  if (profile) {
    await db.insert(userProfiles).values({
      userId: user.id, nombre: profile.nombre, primerApellido: profile.primer_apellido,
      segundoApellido: profile.segundo_apellido ?? null, tipoDocumento: profile.tipo_documento,
      numeroDocumento: profile.numero_documento, fechaNacimiento: profile.fecha_nacimiento,
      genero: profile.genero ?? 'prefiero_no_decir', telefono: profile.telefono ?? null,
      telefonoAlternativo: profile.telefono_alternativo ?? null, pais: profile.pais ?? null,
      departamento: profile.departamento ?? null, ciudad: profile.ciudad ?? null,
      direccion: profile.direccion ?? null, codigoPostal: profile.codigo_postal ?? null,
      createdAt: now, updatedAt: now,
    })
  }

  const result = await db.query.users.findFirst({ where: eq(users.id, user.id), with: withRoles })
  return NextResponse.json(serializeUser(result!), { status: 201 })
}

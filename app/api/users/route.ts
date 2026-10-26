import { NextRequest, NextResponse } from 'next/server'
import { eq, like, isNull, and, or, count, desc, inArray, gte, lte } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, userProfiles, userRoles as userRolesTable, roles as rolesTable } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { syncRoles } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { createUserSchema } from '@/lib/api/schemas/user.schema'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { documentoDuplicadoResponse, documentoEnUso } from '@/lib/api/user-profile'

const withRoles = { profile: true, userRoles: { with: { role: true } } } as const

/** Columnas por las que se puede ordenar: `?sort=campo` (asc) o `?sort=-campo` (desc) */
const SORTABLE = {
  username: users.username,
  email: users.email,
  created_at: users.createdAt,
  last_login_at: users.lastLoginAt,
} as const

// GET /api/users
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams)
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const isActive = searchParams.get('is_active')
  const withTrashed = searchParams.get('with_trashed') === 'true'
  const createdFrom = searchParams.get('created_from') ?? ''
  const createdTo = searchParams.get('created_to') ?? ''
  const loginFrom = searchParams.get('login_from') ?? ''
  const loginTo = searchParams.get('login_to') ?? ''

  const conditions = []
  if (!withTrashed) conditions.push(isNull(users.deletedAt))
  if (isActive !== null && isActive !== '') {
    conditions.push(eq(users.isActive, isActive === 'true'))
  }
  if (search) {
    const term = `%${search}%`
    const byName = db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(
        or(
          like(userProfiles.nombre, term),
          like(userProfiles.primerApellido, term),
          like(userProfiles.segundoApellido, term),
        ),
      )
    conditions.push(or(like(users.email, term), like(users.username, term), inArray(users.id, byName))!)
  }
  if (role) {
    const sub = db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
      .where(eq(rolesTable.name, role))
    conditions.push(inArray(users.id, sub))
  }
  if (createdFrom) conditions.push(gte(users.createdAt, `${createdFrom}T00:00:00.000Z`))
  if (createdTo) conditions.push(lte(users.createdAt, `${createdTo}T23:59:59.999Z`))
  if (loginFrom) conditions.push(gte(users.lastLoginAt, `${loginFrom}T00:00:00.000Z`))
  if (loginTo) conditions.push(lte(users.lastLoginAt, `${loginTo}T23:59:59.999Z`))

  const where = conditions.length ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db.query.users.findMany({
      where,
      with: withRoles,
      orderBy: parseSort(searchParams.get('sort'), SORTABLE, desc(users.createdAt)),
      limit: pagination.perPage,
      offset: pagination.offset,
    }),
    db.select({ total: count() }).from(users).where(where),
  ])

  return NextResponse.json(paginated(rows.map(serializeUser), total, pagination))
}

// POST /api/users
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const raw = await req.json()
  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const { username, email, password, role_ids, is_active, profile } = parsed.data

  // ── Comprobaciones de unicidad ──────────────────────────────────────────────
  const [emailConflict, usernameConflict] = await Promise.all([
    db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) }),
    db.query.users.findFirst({ where: and(eq(users.username, username), isNull(users.deletedAt)) }),
  ])
  if (emailConflict) {
    return NextResponse.json(
      {
        message: 'Datos inválidos',
        errors: { fieldErrors: { email: ['Este correo ya está registrado'] }, formErrors: [] },
      },
      { status: 422 },
    )
  }
  if (usernameConflict) {
    return NextResponse.json(
      {
        message: 'Datos inválidos',
        errors: { fieldErrors: { username: ['Este username ya está en uso'] }, formErrors: [] },
      },
      { status: 422 },
    )
  }
  if (profile && (await documentoEnUso(profile.tipo_documento, profile.numero_documento))) {
    return documentoDuplicadoResponse()
  }
  // ───────────────────────────────────────────────────────────────────────────

  const hashed = await bcrypt.hash(password, 12)
  const now = new Date().toISOString()

  const [user] = await db
    .insert(users)
    .values({ username, email, password: hashed, isActive: is_active ?? true, createdAt: now, updatedAt: now })
    .returning()

  if (role_ids?.length) await syncRoles(user.id, role_ids)

  if (profile) {
    await db.insert(userProfiles).values({
      userId: user.id,
      nombre: profile.nombre,
      primerApellido: profile.primer_apellido ?? null,
      segundoApellido: profile.segundo_apellido ?? null,
      tipoDocumento: profile.tipo_documento,
      numeroDocumento: profile.numero_documento,
      fechaNacimiento: profile.fecha_nacimiento,
      genero: profile.genero ?? 'prefiero_no_decir',
      telefono: profile.telefono ?? null,
      telefonoAlternativo: profile.telefono_alternativo ?? null,
      pais: profile.pais ?? null,
      departamento: profile.departamento ?? null,
      ciudad: profile.ciudad ?? null,
      direccion: profile.direccion ?? null,
      codigoPostal: profile.codigo_postal ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const result = await db.query.users.findFirst({ where: eq(users.id, user.id), with: withRoles })
  return NextResponse.json(serializeUser(result!), { status: 201 })
}

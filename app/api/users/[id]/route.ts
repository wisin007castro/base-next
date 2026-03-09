import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, userProfiles } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { syncRoles } from '@/lib/auth/rbac'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { updateUserSchema } from '@/lib/api/schemas/user.schema'

type Params = { params: Promise<{ id: string }> }

const withRoles = { profile: true, userRoles: { with: { role: true } } } as const

// GET /api/users/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const user = await db.query.users.findFirst({ where: eq(users.id, Number(id)), with: withRoles })
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(serializeUser(user))
}

// PATCH /api/users/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id }  = await params
  const raw     = await req.json()
  const parsed  = updateUserSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const now    = new Date().toISOString()
  const userId = Number(id)
  const body   = parsed.data

  const userValues: Record<string, unknown> = { updatedAt: now }
  if (body.username  !== undefined) userValues.username = body.username
  if (body.email     !== undefined) userValues.email    = body.email
  if (body.is_active !== undefined) userValues.isActive = body.is_active
  if (body.password)                userValues.password = await bcrypt.hash(body.password, 12)

  await db.update(users).set(userValues).where(eq(users.id, userId))

  if (Array.isArray(body.role_ids)) await syncRoles(userId, body.role_ids)

  if (body.profile) {
    const p = body.profile
    const profileValues: Record<string, unknown> = { updatedAt: now }
    const map: Record<string, string> = {
      nombre: 'nombre', primer_apellido: 'primerApellido', segundo_apellido: 'segundoApellido',
      tipo_documento: 'tipoDocumento', numero_documento: 'numeroDocumento',
      fecha_nacimiento: 'fechaNacimiento', genero: 'genero',
      telefono: 'telefono', telefono_alternativo: 'telefonoAlternativo',
      pais: 'pais', departamento: 'departamento', ciudad: 'ciudad',
      direccion: 'direccion', codigo_postal: 'codigoPostal',
    }
    Object.entries(map).forEach(([src, dst]) => {
      if ((p as Record<string, unknown>)[src] !== undefined)
        profileValues[dst] = (p as Record<string, unknown>)[src]
    })

    const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
    if (existing) {
      await db.update(userProfiles).set(profileValues).where(eq(userProfiles.userId, userId))
    } else {
      await db.insert(userProfiles).values({ userId, ...profileValues as never, createdAt: now })
    }
  }

  const result = await db.query.users.findFirst({ where: eq(users.id, userId), with: withRoles })
  return NextResponse.json(serializeUser(result!))
}

// DELETE /api/users/:id  → soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const now    = new Date().toISOString()
  await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}

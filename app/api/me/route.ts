import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users, userProfiles } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'

const withRoles = { profile: true, userRoles: { with: { role: true } } } as const

// GET /api/me
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: 'No autenticado' }, { status: 401 })

  const userId = Number(session.user.id)
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), with: withRoles })
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json(serializeUser(user))
}

// PATCH /api/me
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: 'No autenticado' }, { status: 401 })

  const userId = Number(session.user.id)
  const body   = await req.json()
  const now    = new Date().toISOString()

  const userValues: Record<string, unknown> = { updatedAt: now }
  if (body.username !== undefined) userValues.username = body.username
  if (body.email    !== undefined) userValues.email    = body.email
  if (body.password)               userValues.password = await bcrypt.hash(body.password, 12)

  await db.update(users).set(userValues).where(eq(users.id, userId))

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
      if (p[src] !== undefined) profileValues[dst] = p[src]
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

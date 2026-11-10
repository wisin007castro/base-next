import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { updateMeSchema } from '@/lib/api/schemas/user.schema'
import { saveProfile, validateProfileWrite } from '@/lib/api/user-profile'

const withRoles = { profile: true, userRoles: { with: { role: true } } } as const

// GET /api/me
export async function GET() {
  const guard = await requireAuth({ allowTwoFactorSetup: true })
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), with: withRoles })
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json(serializeUser(user))
}

// PATCH /api/me
export async function PATCH(req: NextRequest) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)
  const parsed = updateMeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
  const body = parsed.data
  const now = new Date().toISOString()

  if (body.profile) {
    const res = await validateProfileWrite(userId, body.profile)
    if (res) return res
  }

  const userValues: Record<string, unknown> = { updatedAt: now }
  if (body.username !== undefined) userValues.username = body.username
  if (body.email !== undefined) userValues.email = body.email

  // FEAT 4: cambio de contraseña requiere verificar current_password
  if (body.password) {
    if (!body.current_password) {
      return NextResponse.json(
        {
          message: 'Datos inválidos',
          errors: { fieldErrors: { current_password: ['La contraseña actual es requerida'] } },
        },
        { status: 422 },
      )
    }

    const currentUser = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!currentUser) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    const valid = await bcrypt.compare(body.current_password, currentUser.password)
    if (!valid) {
      return NextResponse.json(
        {
          message: 'Datos inválidos',
          errors: { fieldErrors: { current_password: ['La contraseña actual es incorrecta'] } },
        },
        { status: 422 },
      )
    }

    userValues.password = await bcrypt.hash(body.password, 12)
  }

  try {
    await db.update(users).set(userValues).where(eq(users.id, userId))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }

  if (body.profile) {
    const res = await saveProfile(userId, body.profile, now)
    if (res) return res
  }

  const result = await db.query.users.findFirst({ where: eq(users.id, userId), with: withRoles })
  return NextResponse.json(serializeUser(result!))
}

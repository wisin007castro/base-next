import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { invitations, userRoles, users } from '@/lib/db/schema'
import { acceptInvitationSchema } from '@/lib/api/schemas/invitation.schema'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { findUsableInvitation } from '@/lib/auth/invitations'
import { logger } from '@/lib/logger'
import type { InvitationPreview } from '@/lib/types/invitation.types'

// Rutas públicas: el token del enlace (256 bits, solo su hash en la BD) es la credencial

const invalid = () =>
  NextResponse.json({ message: 'La invitación no es válida o ya caducó. Pide una nueva.' }, { status: 410 })

// GET /api/invitations/accept?token= — datos para mostrar en la página de aceptación
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const invitation = token ? await findUsableInvitation(token) : undefined
  if (!invitation) return invalid()

  const preview: InvitationPreview = {
    email: invitation.email,
    roles: invitation.roles.map(r => r.role.name),
    expires_at: invitation.expiresAt,
  }
  return NextResponse.json(preview)
}

// POST /api/invitations/accept — crea la cuenta (email ya verificado: llegó al correo) con los roles
export async function POST(req: NextRequest) {
  const parsed = acceptInvitationSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
  const { token, username, password } = parsed.data

  const invitation = await findUsableInvitation(token)
  if (!invitation) return invalid()

  const hashed = await bcrypt.hash(password, 12)
  const now = new Date().toISOString()

  try {
    const userId = db.transaction(tx => {
      const { id } = tx
        .insert(users)
        .values({
          username,
          email: invitation.email,
          password: hashed,
          isActive: true,
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id })
        .get()
      if (invitation.roles.length) {
        tx.insert(userRoles)
          .values(invitation.roles.map(r => ({ userId: id, roleId: r.roleId })))
          .run()
      }
      tx.update(invitations)
        .set({ acceptedAt: now, acceptedUserId: id, updatedAt: now })
        .where(eq(invitations.id, invitation.id))
        .run()
      return id
    })
    logger.info({ module: 'invitations', invitationId: invitation.id, userId }, 'invitación aceptada')
  } catch (err) {
    // username ya usado (o el email se registró después de invitar)
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }

  return NextResponse.json({ email: invitation.email }, { status: 201 })
}

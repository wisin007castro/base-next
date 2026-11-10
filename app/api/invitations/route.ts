import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitationRoles, invitations, roles, users } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { createInvitationSchema } from '@/lib/api/schemas/invitation.schema'
import { findInvitation, listInvitations, serializeInvitation } from '@/lib/api/serializers/invitation.serializer'
import { invitationExpiry, newInvitationToken } from '@/lib/auth/invitations'
import { sendInvitationEmail } from '@/lib/mail/mail.service'
import { logger } from '@/lib/logger'
import { getSettings } from '@/lib/settings'

const log = logger.child({ module: 'invitations' })

// GET /api/invitations — todas, más recientes primero (con estado pendiente/aceptada/caducada)
export async function GET() {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard
  return NextResponse.json((await listInvitations()).map(serializeInvitation))
}

// POST /api/invitations — crea la invitación y envía el correo.
// Reinvitar al mismo email sustituye la invitación pendiente anterior (su enlace deja de valer).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const parsed = createInvitationSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
  const { email, role_ids } = parsed.data

  const existing = await db.query.users.findFirst({
    where: and(sql`lower(${users.email}) = ${email}`, isNull(users.deletedAt)),
    columns: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      {
        message: 'Datos inválidos',
        errors: { formErrors: [], fieldErrors: { email: ['Ya existe un usuario con este correo'] } },
      },
      { status: 422 },
    )
  }

  const roleRows = role_ids.length
    ? await db.select({ id: roles.id, name: roles.name }).from(roles).where(inArray(roles.id, role_ids))
    : []
  if (roleRows.length !== role_ids.length) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: { role_ids: ['Algún rol no existe'] } } },
      { status: 422 },
    )
  }

  const { token, tokenHash } = newInvitationToken()
  const expiresAt = invitationExpiry((await getSettings('access')).invitationDays)
  const id = db.transaction(tx => {
    tx.delete(invitations)
      .where(and(eq(invitations.email, email), isNull(invitations.acceptedAt)))
      .run()
    const { id } = tx
      .insert(invitations)
      .values({ email, tokenHash, invitedById: Number(guard.user.id), expiresAt })
      .returning({ id: invitations.id })
      .get()
    if (role_ids.length)
      tx.insert(invitationRoles)
        .values(role_ids.map(roleId => ({ invitationId: id, roleId })))
        .run()
    return id
  })

  try {
    await sendInvitationEmail(email, {
      token,
      invitedBy: guard.user.name,
      roles: roleRows.map(r => r.name),
      expiresAt,
    })
  } catch (err) {
    // La invitación queda creada: se puede reenviar desde la lista
    log.error({ err, invitationId: id }, 'no se pudo enviar el correo de invitación')
    return NextResponse.json(
      { message: 'La invitación se creó, pero no se pudo enviar el correo. Reenvíala desde la lista.' },
      { status: 502 },
    )
  }

  log.info({ invitationId: id, invitedBy: guard.user.id }, 'invitación enviada')
  return NextResponse.json(serializeInvitation((await findInvitation(id))!), { status: 201 })
}

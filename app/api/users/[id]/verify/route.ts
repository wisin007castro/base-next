import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { sendVerificationEmail } from '@/lib/mail/mail.service'

// POST /api/users/:id/verify — verificación manual por el administrador
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await db.query.users.findFirst({ where: eq(users.id, Number(id)) })

  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  if (user.emailVerifiedAt) return NextResponse.json({ message: 'El correo ya está verificado' }, { status: 400 })

  const now = new Date().toISOString()
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, Number(id)))

  const updated = await db.query.users.findFirst({
    where: eq(users.id, Number(id)),
    with: { profile: true, userRoles: { with: { role: true } } },
  })

  // Notificar al usuario por correo (error no bloqueante)
  sendVerificationEmail(updated!.email, updated!.username).catch(console.error)

  return NextResponse.json(serializeUser(updated!))
}

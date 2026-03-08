import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// POST /api/users/:id/resend-verification
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user   = await db.query.users.findFirst({ where: eq(users.id, Number(id)) })

  if (!user)               return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  if (user.emailVerifiedAt) return NextResponse.json({ message: 'El correo ya está verificado' }, { status: 400 })

  // TODO: integrar servicio de email (Resend, Nodemailer, etc.)
  // Por ahora retornamos éxito para que el flujo frontend funcione
  return NextResponse.json({ message: 'Correo de verificación enviado' })
}

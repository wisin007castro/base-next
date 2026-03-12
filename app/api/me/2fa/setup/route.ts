import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

const APP_NAME = 'MyApp'

// POST /api/me/2fa/setup — genera secret y QR para configurar 2FA
export async function POST() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  }

  // Generar nuevo secret
  const secret = generateSecret()

  // Guardar secret en DB (sin activar aún)
  await db
    .update(users)
    .set({ twoFactorSecret: secret, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))

  // Generar otpauth URL
  const otpauthUrl = generateURI({
    issuer: APP_NAME,
    label:  `${APP_NAME}:${user.email}`,
    secret,
  })

  // Generar data URL del QR
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

  return NextResponse.json({ secret, qrDataUrl })
}

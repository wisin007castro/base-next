import { eq } from 'drizzle-orm'
import { verify } from 'otplib'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { rateLimit } from '@/lib/api/rate-limiter'
import { logger } from '@/lib/logger'

export type TotpResult = 'ok' | 'invalid' | 'rate_limited' | 'not_configured'

/**
 * Verifica un código TOTP contra el secreto guardado del usuario.
 * Única puerta para 2FA: la usan el endpoint (mensajes al usuario) y el callback jwt (el que
 * concede la sesión), con un límite de intentos compartido: 6 dígitos sin límite se adivinan.
 * Ojo: `verify()` de otplib v13 devuelve `{ valid }`, no un boolean.
 */
export async function verifyTotp(userId: number, code: string): Promise<TotpResult> {
  if (!rateLimit(`2fa:${userId}`, 10, 15 * 60 * 1000).allowed) {
    logger.warn({ module: 'auth', userId }, '2FA bloqueado por límite de intentos')
    return 'rate_limited'
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { twoFactorSecret: true } })
  if (!user?.twoFactorSecret) return 'not_configured'

  const { valid } = await verify({ token: code, secret: user.twoFactorSecret })
  if (!valid) logger.info({ module: 'auth', userId }, '2FA: código incorrecto')
  return valid ? 'ok' : 'invalid'
}

import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { loginCodes, users } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { rateLimit } from '@/lib/api/rate-limiter'
import { getSettings } from '@/lib/settings'
import { sendLoginCodeEmail } from '@/lib/mail/mail.service'
import { logger } from '@/lib/logger'

/**
 * Inicio de sesión con código por correo (Configuración → Acceso → loginCodeEnabled).
 * El código (6 dígitos) se guarda como HMAC con AUTH_SECRET, vale una vez, caduca y admite
 * MAX_ATTEMPTS intentos. Pedir un código no revela si el correo existe.
 */
const MAX_ATTEMPTS = 5
const log = logger.child({ module: 'auth' })

const hmac = (code: string) => createHmac('sha256', env.AUTH_SECRET).update(`login-code:${code}`).digest('hex')

const findActiveUser = (email: string) =>
  db.query.users.findFirst({
    where: and(
      sql`lower(${users.email}) = ${email.trim().toLowerCase()}`,
      eq(users.isActive, true),
      isNull(users.deletedAt),
    ),
  })

export type RequestCodeResult = 'sent' | 'disabled' | 'rate_limited'

/** Genera y envía un código. Responde igual exista o no el usuario (no revela cuentas). */
export async function requestLoginCode(email: string): Promise<RequestCodeResult> {
  const { loginCodeEnabled, loginCodeMinutes } = await getSettings('access')
  if (!loginCodeEnabled) return 'disabled'
  if (!rateLimit(`login-code-request:${email.toLowerCase()}`, 3, 15 * 60 * 1000).allowed) {
    log.warn({ email }, 'código de acceso: demasiadas solicitudes')
    return 'rate_limited'
  }

  const user = await findActiveUser(email)
  if (!user) {
    log.info({ email }, 'código de acceso pedido para un correo sin cuenta activa')
    return 'sent'
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const now = new Date()
  db.transaction(tx => {
    // Solo vale el último código pedido
    tx.update(loginCodes)
      .set({ usedAt: now.toISOString() })
      .where(and(eq(loginCodes.userId, user.id), isNull(loginCodes.usedAt)))
      .run()
    tx.insert(loginCodes)
      .values({
        userId: user.id,
        codeHash: hmac(code),
        expiresAt: new Date(now.getTime() + loginCodeMinutes * 60_000).toISOString(),
      })
      .run()
  })

  await sendLoginCodeEmail(user.email, code, loginCodeMinutes)
  log.info({ userId: user.id }, 'código de acceso enviado')
  return 'sent'
}

/** Verifica el código y lo consume. Devuelve el usuario o null (código malo, caducado o agotado). */
export async function consumeLoginCode(email: string, code: string) {
  if (!(await getSettings('access')).loginCodeEnabled) return null
  const user = await findActiveUser(email)
  if (!user) return null

  const row = await db.query.loginCodes.findFirst({
    where: and(
      eq(loginCodes.userId, user.id),
      isNull(loginCodes.usedAt),
      gt(loginCodes.expiresAt, new Date().toISOString()),
    ),
    orderBy: [desc(loginCodes.createdAt), desc(loginCodes.id)],
  })
  if (!row || row.attempts >= MAX_ATTEMPTS) return null

  const ok = /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(hmac(code), 'hex'), Buffer.from(row.codeHash, 'hex'))
  if (!ok) {
    await db
      .update(loginCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(loginCodes.id, row.id))
    log.info({ userId: user.id, attempts: row.attempts + 1 }, 'código de acceso incorrecto')
    return null
  }

  await db.update(loginCodes).set({ usedAt: new Date().toISOString() }).where(eq(loginCodes.id, row.id))
  return user
}

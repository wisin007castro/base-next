import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret'
const SEPARATOR = '.'

/** Genera un token firmado con HMAC-SHA256: `userId.expiresAt.signature` */
export function generateVerificationToken(userId: number, expiresInMs = 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + expiresInMs
  const payload   = `${userId}${SEPARATOR}${expiresAt}`
  const signature = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}${SEPARATOR}${signature}`).toString('base64url')
}

/** Verifica el token. Devuelve el userId si es válido, null si no. */
export function verifyToken(token: string): number | null {
  try {
    const decoded  = Buffer.from(token, 'base64url').toString()
    const parts    = decoded.split(SEPARATOR)
    if (parts.length !== 3) return null

    const [userIdStr, expiresAtStr, signature] = parts
    const payload  = `${userIdStr}${SEPARATOR}${expiresAtStr}`
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex')

    // Comparación segura contra timing attacks
    const sigBuffer = Buffer.from(signature, 'hex')
    const expBuffer = Buffer.from(expected,  'hex')
    if (sigBuffer.length !== expBuffer.length) return null
    if (!timingSafeEqual(sigBuffer, expBuffer)) return null

    if (Date.now() > Number(expiresAtStr)) return null // expirado

    return Number(userIdStr)
  } catch {
    return null
  }
}

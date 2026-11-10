import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { env } from '@/lib/env'

// Secretos guardados en la BD (contraseña SMTP), cifrados con AES-256-GCM y una clave derivada de
// AUTH_SECRET. Si AUTH_SECRET cambia ya no se pueden leer y hay que volver a escribirlos.
const key = () => createHash('sha256').update(`settings-secrets:${env.AUTH_SECRET}`).digest()

const VERSION = 'v1'

export function encryptSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map(p => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.')
}

/** null si no se puede descifrar (AUTH_SECRET cambió o el valor está dañado) */
export function decryptSecret(value: string): string | null {
  try {
    const [version, iv, tag, data] = value.split('.')
    if (version !== VERSION || !iv || !tag || !data) return null
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

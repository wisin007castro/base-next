import pino, { type Logger } from 'pino'
import { env } from '@/lib/env'

/**
 * Logger del servidor. En desarrollo, salida legible (pino-pretty, sin worker threads: los
 * transports de pino no sobreviven al bundle de Next); en producción, JSON por línea para el
 * agregador de logs.
 *
 *   const log = logger.child({ module: 'auth' })
 *   log.info({ userId }, 'login correcto')
 *   log.warn({ email }, 'login fallido')     // datos en el objeto, mensaje fijo: se puede filtrar
 *
 * Nunca registrar contraseñas, tokens, secretos ni códigos 2FA.
 */
function create(): Logger {
  const isDev = env.NODE_ENV !== 'production'
  const options = {
    level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    // Defensa extra por si alguien loguea un objeto entero
    // (no `code`: taparía err.code, p. ej. SQLITE_CONSTRAINT_UNIQUE)
    redact: ['password', '*.password', 'token', '*.token', 'secret', '*.secret'],
  }
  if (!isDev) return pino(options)
  // require: pino-pretty es devDependency, no se carga en producción
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pretty = require('pino-pretty') as typeof import('pino-pretty')
  return pino(options, pretty({ colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }))
}

// Singleton: el hot-reload de Next no debe crear un logger por recarga
const g = globalThis as unknown as { _logger?: Logger }
export const logger = (g._logger ??= create())

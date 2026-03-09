/**
 * Rate limiter en memoria (ventana deslizante).
 * Apto para un servidor Node.js de larga duración (dev / producción single-instance).
 * Para producción multi-instancia usar Redis + @upstash/ratelimit.
 */

interface Bucket {
  count:   number
  resetAt: number
}

const store = new Map<string, Bucket>()

// Limpiar entradas caducadas cada minuto
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((val, key) => { if (val.resetAt < now) store.delete(key) })
  }, 60_000)
}

/**
 * @param key       Clave única (p. ej. `login:email@ejemplo.com`)
 * @param limit     Número máximo de intentos permitidos
 * @param windowMs  Duración de la ventana en milisegundos
 */
export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now    = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }

  bucket.count++
  return { allowed: true, retryAfterMs: 0 }
}

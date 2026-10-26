// Next.js lo ejecuta al arrancar el servidor (dev y producción), en el runtime Node y en el Edge.
// Los imports de solo-Node van dentro de `if (NEXT_RUNTIME === 'nodejs')`: Next sustituye la
// variable al compilar y elimina el bloque en el bundle Edge (pino necesita `stream`).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Valida las variables de entorno: si algo falta, el servidor no arranca y lo dice
    await import('./lib/env')
  }
}

// Errores no capturados en route handlers, server components y middleware → log estructurado
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger')
    logger.error({ err, method: request.method, path: request.path, route: context.routePath }, 'error no controlado')
  }
}

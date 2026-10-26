// Next.js lo ejecuta una vez al arrancar el servidor (dev y producción)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Valida las variables de entorno: si algo falta, el servidor no arranca y lo dice
    await import('./lib/env')
  }
}

import { z } from '@/lib/validation/zod-config'

/**
 * Variables de entorno del servidor, validadas una vez al arrancar (instrumentation.ts).
 * Si falta o sobra algo, el servidor no arranca y dice qué variable y por qué; antes fallaba
 * más tarde y lejos del origen (p. ej. AUTH_SECRET vacío → tokens firmados con 'dev-secret').
 *
 * Usar siempre `env.X`, nunca `process.env.X` (salvo NODE_ENV/NEXT_RUNTIME, que pone Next).
 * Valores por defecto = entorno de desarrollo con docker-compose (MailDev, MinIO).
 */
const boolString = z.enum(['true', 'false']).transform(v => v === 'true')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Auth
  AUTH_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres. Genera uno con: npx auth secret'),
  NEXTAUTH_URL: z.url().default('http://localhost:3005'),

  // Base de datos (SQLite)
  DATABASE_URL: z.string().min(1).default('./dev.db'),

  // Correo (MailDev en desarrollo)
  MAIL_HOST: z.string().min(1).default('127.0.0.1'), // IPv4 explícito: localhost puede resolver a ::1
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_SECURE: boolString.default(false),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1).default('noreply@localhost'),

  // Almacenamiento S3/MinIO (avatares). Opcional: sin él la app funciona, pero subir avatares falla
  STORAGE_ENDPOINT: z.url().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.url().optional(),

  // Logs (pino): trace | debug | info | warn | error | fatal
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
})

export type Env = z.output<typeof schema>

function load(): Env {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Variables de entorno inválidas (.env / .env.local):\n${lines}`)
  }
  return parsed.data
}

export const env = load()

/** Config de almacenamiento, o error claro si falta (solo se exige al subir/borrar archivos) */
export function storageEnv() {
  const { STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET, STORAGE_PUBLIC_URL } = env
  if (!STORAGE_ENDPOINT || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY || !STORAGE_BUCKET || !STORAGE_PUBLIC_URL) {
    throw new Error(
      'Almacenamiento no configurado: define STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET y STORAGE_PUBLIC_URL',
    )
  }
  return {
    endpoint: STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    accessKey: STORAGE_ACCESS_KEY,
    secretKey: STORAGE_SECRET_KEY,
    bucket: STORAGE_BUCKET,
    publicUrl: STORAGE_PUBLIC_URL,
  }
}

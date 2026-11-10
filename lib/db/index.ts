import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { env } from '@/lib/env'

type DB = BetterSQLite3Database<typeof schema>

// Se cachea la CONEXIÓN (una sola en hot-reload), no el wrapper de Drizzle: el wrapper se crea
// en cada carga del módulo con el schema actual. Si se cacheara, una tabla nueva no aparecería
// en db.query.* hasta reiniciar el servidor ("Cannot read properties of undefined (reading 'findMany')").
const globalForDb = global as unknown as { _sqlite: Database.Database | undefined }

function connect() {
  const sqlite = new Database(env.DATABASE_URL)
  // SQLite no aplica las FOREIGN KEY por defecto: sin esto los onDelete del schema no hacen nada
  sqlite.pragma('foreign_keys = ON')
  return sqlite
}

export const db: DB = drizzle((globalForDb._sqlite ??= connect()), { schema })

// Exportar esquema para usarlo con db.query.*
export { schema }

/**
 * Para migrar a PostgreSQL en el futuro, reemplazar este archivo con:
 *
 * import { drizzle } from 'drizzle-orm/postgres-js'
 * import postgres from 'postgres'
 * const client = postgres(process.env.DATABASE_URL!)
 * export const db = drizzle(client, { schema })
 */

import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

type DB = BetterSQLite3Database<typeof schema>

// Singleton para evitar múltiples conexiones en hot-reload de Next.js
const globalForDb = global as unknown as { _db: DB | undefined }

function createDb(): DB {
  const sqlite = new Database(process.env.DATABASE_URL ?? './dev.db')
  // SQLite no aplica las FOREIGN KEY por defecto: sin esto los onDelete del schema no hacen nada
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export const db: DB = globalForDb._db ?? (globalForDb._db = createDb())

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

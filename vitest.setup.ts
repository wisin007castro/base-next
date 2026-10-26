import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '@/lib/db'

// SQLite en memoria (DATABASE_URL=':memory:' en vitest.config.ts) con el esquema real
migrate(db, { migrationsFolder: './drizzle/migrations' })

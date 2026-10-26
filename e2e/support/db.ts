import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'

/** Usuarios creados por global-setup (emails únicos por ejecución: el rate limit de login es por email). */
export interface E2EUsers {
  admin: { email: string; password: string }
  user: { email: string; password: string }
}

export const USERS_FILE = path.join(__dirname, '..', '.auth', 'users.json')
export const PASSWORD = 'E2e-Secreta-123'
/** Prefijo de todo lo que crean las pruebas; global-teardown lo borra. */
export const PREFIX = 'e2e '

export const openDb = () => {
  const db = new Database(process.env.DATABASE_URL ?? 'dev.db')
  db.pragma('foreign_keys = ON')
  return db
}

export const readUsers = (): E2EUsers => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))

export function createUser(db: Database.Database, email: string, username: string, role: string) {
  const now = new Date().toISOString()
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO users (username, email, password, is_active, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
    )
    .run(username, email, bcrypt.hashSync(PASSWORD, 4), now, now, now)
  const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number } | undefined
  if (!roleRow) throw new Error(`No existe el rol "${role}": corre npm run db:seed`)
  db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(lastInsertRowid, roleRow.id)
}

/** Borra usuarios e2e (cascada: perfil, sesiones, publicaciones, comentarios, votos) y datos con el prefijo. */
export function cleanup(db: Database.Database) {
  const like = `${PREFIX}%`
  db.prepare("DELETE FROM users WHERE email LIKE 'e2e-%@test.local'").run()
  db.prepare('DELETE FROM publicaciones WHERE titulo LIKE ?').run(like)
  db.prepare('DELETE FROM categorias WHERE nombre LIKE ?').run(like)
  db.prepare('DELETE FROM etiquetas WHERE nombre LIKE ?').run(like)
}

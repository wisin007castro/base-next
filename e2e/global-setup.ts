import fs from 'node:fs'
import path from 'node:path'
import { cleanup, createUser, openDb, PASSWORD, USERS_FILE, type E2EUsers } from './support/db'

export default function globalSetup() {
  const run = Date.now().toString(36)
  const users: E2EUsers = {
    admin: { email: `e2e-admin-${run}@test.local`, password: PASSWORD },
    user: { email: `e2e-user-${run}@test.local`, password: PASSWORD, documento: `E2E-${run}` },
  }

  const db = openDb()
  try {
    cleanup(db) // restos de una ejecución interrumpida
    createUser(db, users.admin.email, `e2e_admin_${run}`, 'admin')
    createUser(db, users.user.email, `e2e_user_${run}`, 'usuario', users.user.documento)
  } finally {
    db.close()
  }

  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true })
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

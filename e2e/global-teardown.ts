import { cleanup, openDb } from './support/db'

export default function globalTeardown() {
  const db = openDb()
  try {
    cleanup(db)
  } finally {
    db.close()
  }
}

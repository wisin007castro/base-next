import { expect, test } from '@playwright/test'
import { openDb, readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'

// Sesión propia del usuario "usuario" (no la del admin)
test.use({ storageState: { cookies: [], origins: [] } })

/** Cambios hechos "por otro admin" directamente en la BD, sin que el usuario vuelva a iniciar sesión */
function asAdmin(fn: (db: ReturnType<typeof openDb>, userId: number) => void) {
  const db = openDb()
  try {
    const { id } = db.prepare('SELECT id FROM users WHERE email = ?').get(readUsers().user.email) as { id: number }
    fn(db, id)
  } finally {
    db.close()
  }
}

const setRole = (role: 'admin' | 'usuario') =>
  asAdmin((db, id) => {
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id)
    db.prepare('INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name = ?').run(id, role)
  })

const setActive = (active: boolean) =>
  asAdmin((db, id) => db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id))

test.describe.serial('La sesión sigue los cambios del usuario', () => {
  test.afterAll(() => {
    setRole('usuario')
    setActive(true)
  })

  test('un cambio de rol aplica sin volver a iniciar sesión', async ({ page }) => {
    const { user } = readUsers()
    await login(page, user.email, user.password)
    await expectLoggedIn(page)

    expect((await page.request.get('/api/users')).status()).toBe(403)
    setRole('admin')
    expect((await page.request.get('/api/users')).status()).toBe(200)
    setRole('usuario')
    expect((await page.request.get('/api/users')).status()).toBe(403)

    // Desactivado por un admin → la sesión deja de valer
    setActive(false)
    expect((await page.request.get('/api/me')).status()).toBe(401)
    await page.goto('/perfil')
    await expect(page).toHaveURL(/\/login/)
  })
})

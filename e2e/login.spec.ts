import { expect, test, type Page } from '@playwright/test'
import { readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'

// El route announcer de Next también tiene role=alert: buscar solo dentro del main
const loginAlert = (page: Page) => page.locator('form').locator('..').getByRole('alert')

// Sin sesión guardada: estas pruebas parten deslogueadas
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login', () => {
  test('contraseña incorrecta muestra el error', async ({ page }) => {
    const { user } = readUsers()
    await login(page, user.email, 'incorrecta')
    await expect(loginAlert(page)).toHaveText('Correo o contraseña incorrectos.')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    await expect(page).toHaveURL(/\/login/)
  })

  test('demasiados intentos avisa del bloqueo', async ({ page }) => {
    const email = `e2e-ratelimit-${Date.now()}@test.local` // no existe: solo cuenta intentos
    await login(page, email, 'x')
    await expect(loginAlert(page)).toHaveText('Correo o contraseña incorrectos.')
    // Reenviar el mismo formulario: 4 fallos más llegan al límite (5 cada 15 min)
    for (let i = 0; i < 4; i++) {
      const res = page.waitForResponse(r => r.url().includes('/api/auth/callback/credentials'))
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await res
      await expect(loginAlert(page)).toHaveText('Correo o contraseña incorrectos.')
    }
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(loginAlert(page)).toContainText('Demasiados intentos')
  })

  test('credenciales correctas entran al inicio', async ({ page }) => {
    const { user } = readUsers()
    await login(page, user.email, user.password)
    await expectLoggedIn(page)
  })

  test('una ruta protegida sin sesión redirige al login', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/login/)
  })
})

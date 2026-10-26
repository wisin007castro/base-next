import { expect, test } from '@playwright/test'
import { generate, generateSecret } from 'otplib'
import { createUser, openDb, PASSWORD } from './support/db'
import { login } from './support/login'

test.use({ storageState: { cookies: [], origins: [] } })

test('login con 2FA: código erróneo, intento de saltarlo y código correcto', async ({ page }) => {
  // Usuario propio con 2FA ya activo (el teardown lo borra por el email e2e-*)
  const email = `e2e-2fa-${Date.now()}@test.local`
  const secret = generateSecret()
  const db = openDb()
  try {
    createUser(db, email, `e2e_2fa_${Date.now()}`, 'usuario')
    db.prepare('UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE email = ?').run(secret, email)
  } finally {
    db.close()
  }

  await login(page, email, PASSWORD)
  await page.waitForURL(/\/verify-2fa/)
  const alert = page.locator('form').locator('..').getByRole('alert')

  // Código erróneo
  await page.getByLabel('Código OTP').fill('000000')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(alert).toHaveText('Código incorrecto')

  // Saltarse el código: update() de la sesión con datos inventados desde el navegador
  const me = await page.evaluate(async () => {
    const { csrfToken } = await (await fetch('/api/auth/csrf')).json()
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrfToken, data: { twoFactorVerified: true, twoFactorCode: '123456' } }),
    })
    const res = await fetch('/api/me')
    return { status: res.status, url: res.url }
  })
  // Sigue pendiente: el middleware la manda a /verify-2fa (y si llegara a la API, requireAuth da 403)
  expect(me.status === 403 || me.url.endsWith('/verify-2fa')).toBe(true)
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/verify-2fa/)

  // Código correcto
  await page.getByLabel('Código OTP').fill(await generate({ secret }))
  await page.getByRole('button', { name: 'Verificar' }).click()
  await page.waitForURL(url => url.pathname === '/')
  expect((await page.request.get('/api/me')).status()).toBe(200)
})

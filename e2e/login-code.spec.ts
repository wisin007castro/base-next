import { expect, test } from '@playwright/test'
import { createUser, openDb } from './support/db'
import { expectLoggedIn } from './support/login'
import { waitForMail } from './support/maildev'

const loginAlert = (page: import('@playwright/test').Page) => page.locator('form').locator('..').getByRole('alert')

test('login con código por correo (si está activado)', async ({ request, browser }) => {
  // Usuario propio: el límite de intentos de login es por email
  const email = `e2e-code-${Date.now()}@test.local`
  const db = openDb()
  createUser(db, email, `e2e_code_${Date.now()}`, 'usuario')
  db.close()

  const original = await (await request.get('/api/settings/access')).json()
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await ctx.newPage()
  try {
    // Desactivado: no se ofrece
    await request.put('/api/settings/access', { data: { ...original, loginCodeEnabled: false } })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar con un código por correo' })).toHaveCount(0)

    await request.put('/api/settings/access', { data: { ...original, loginCodeEnabled: true } })
    await page.reload()
    await page.getByRole('button', { name: 'Entrar con un código por correo' }).click()
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByText('Si el correo está registrado, te enviamos un código.')).toBeVisible()

    const mail = await waitForMail(email)
    const code = mail.subject.match(/^(\d{6})/)?.[1]
    expect(code, mail.subject).toBeTruthy()

    // Código erróneo
    await page.getByLabel('Código').fill(code === '000000' ? '111111' : '000000')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(loginAlert(page)).toHaveText('Código incorrecto o caducado.')

    // Código correcto
    await page.getByLabel('Código').fill(code!)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expectLoggedIn(page)

    // Pedir un código para un correo sin cuenta responde igual (no revela qué correos existen)
    const unknown = await request.post('/api/auth/login-code', { data: { email: 'nadie-e2e@test.local' } })
    expect(unknown.ok()).toBeTruthy()
    expect((await unknown.json()).message).toBe('Si el correo está registrado, te enviamos un código.')
  } finally {
    await request.put('/api/settings/access', { data: original })
    await ctx.close()
  }
})

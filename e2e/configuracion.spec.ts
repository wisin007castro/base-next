import { expect, test, type APIRequestContext } from '@playwright/test'
import { generate } from 'otplib'
import { openDb, readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'
import { waitForMail } from './support/maildev'

// La configuración es global (vive en dev.db): cada prueba la deja como estaba, por la API
// (el servidor la cachea en memoria; escribir la BD directamente no la refrescaría)
const get = async (request: APIRequestContext, section: string) =>
  (await request.get(`/api/settings/${section}`)).json()
const put = async (request: APIRequestContext, section: string, body: unknown) => {
  const res = await request.put(`/api/settings/${section}`, { data: body })
  expect(res.ok(), await res.text()).toBeTruthy()
}

/** Puerto SMTP de MailDev visto desde el servidor (local: registro de puertos; CI: 1025) */
const SMTP_PORT = Number(process.env.E2E_SMTP_PORT ?? 1026)

test.describe('Configuración', () => {
  // Red de seguridad: si una prueba se corta antes de su `finally`, se restaura la BD tal cual
  // estaba (el servidor lo ve en <= 10 s: la caché de settings caduca) y se quita el 2FA del admin
  let snapshot: { key: string; value: string }[] = []
  test.beforeAll(() => {
    const db = openDb()
    snapshot = db.prepare('SELECT key, value FROM settings').all() as typeof snapshot
    db.close()
  })
  test.afterAll(() => {
    const db = openDb()
    db.transaction(() => {
      db.prepare('DELETE FROM settings').run()
      const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      for (const s of snapshot) insert.run(s.key, s.value)
      db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE email = ?').run(
        readUsers().admin.email,
      )
    })()
    db.close()
  })

  test('sistema: el nombre se ve en el menú', async ({ page, request }) => {
    const original = await get(request, 'system')
    const nombre = `Sistema E2E ${Date.now()}`
    try {
      await page.goto('/configuracion')
      await page.getByLabel(/^Nombre del sistema/).fill(nombre)
      await page.getByRole('button', { name: 'Guardar' }).first().click()
      await expect(page.getByText('Configuración del sistema guardada')).toBeVisible()
      await expect(page.locator('aside')).toContainText(nombre)
    } finally {
      await put(request, 'system', original)
    }
  })

  test('correo: configurarlo aquí y enviar uno de prueba', async ({ page, request }) => {
    const original = await get(request, 'mail')
    delete original.hasPassword
    try {
      await page.goto('/configuracion')
      await page.getByLabel(/^Origen de la configuración/).selectOption({ label: 'Configurado aquí' })
      await page.getByLabel(/^Servidor/).fill('127.0.0.1')
      await page.getByLabel(/^Puerto/).fill(String(SMTP_PORT))
      await page.getByLabel(/^Remitente/).fill('E2E <e2e@test.local>')
      await page.getByRole('button', { name: 'Guardar' }).last().click()
      await expect(page.getByText('Configuración de correo guardada')).toBeVisible()

      const to = `e2e-mail-${Date.now()}@test.local`
      await page.getByLabel(/^Enviar a/).fill(to)
      await page.getByRole('button', { name: 'Enviar correo de prueba' }).click()
      await expect(page.getByText(`Correo de prueba enviado a ${to}`)).toBeVisible()
      const mail = await waitForMail(to)
      expect(mail.subject).toContain('Correo de prueba')
    } finally {
      await put(request, 'mail', { ...original, clearPass: false })
    }
  })

  test('acceso: 2FA obligatorio para administradores', async ({ request, browser }) => {
    const original = await get(request, 'access')
    const { admin } = readUsers()
    await put(request, 'access', { ...original, twoFactorPolicy: 'admins' })

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    try {
      // Un admin sin 2FA solo puede entrar a configurarlo
      await login(page, admin.email, admin.password)
      await page.waitForURL(/\/configurar-2fa/)
      expect((await page.request.get('/api/users')).status()).toBe(403)
      await page.goto('/usuarios')
      await expect(page).toHaveURL(/\/configurar-2fa/)

      // Al activarlo se abre la app
      await page.getByRole('button', { name: 'Configurar 2FA' }).click()
      const secret = (await page.locator('code').first().textContent())!.trim()
      await page.getByLabel(/^Código de verificación/).fill(await generate({ secret }))
      await page.getByRole('button', { name: 'Activar 2FA' }).click()
      await expectLoggedIn(page)
      expect((await page.request.get('/api/users')).status()).toBe(200)

      // Con la política activa no se puede desactivar
      const res = await page.request.post('/api/me/2fa/disable', { data: { password: admin.password } })
      expect(res.status()).toBe(409)
    } finally {
      // Restaurar con la sesión que ya cumple la política, y quitar el 2FA del admin de pruebas
      await page.request.put('/api/settings/access', { data: original })
      const db = openDb()
      db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE email = ?').run(admin.email)
      db.close()
      await ctx.close()
    }
  })
})

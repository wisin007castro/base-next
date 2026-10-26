import { expect, test, type Page } from '@playwright/test'
import { openDb, PASSWORD } from './support/db'
import { linkFrom, waitForMail } from './support/maildev'

const row = (page: Page, email: string) => page.getByRole('row').filter({ hasText: email })

async function invitar(page: Page, email: string, role: string) {
  await page.goto('/usuarios/invitaciones')
  await page.getByLabel(/^Correo electrónico/).fill(email)
  await page.getByRole('checkbox', { name: role, exact: true }).check()
  await page.getByRole('button', { name: 'Enviar invitación' }).click()
  await expect(page.getByText('Invitación enviada')).toBeVisible()
  await expect(row(page, email)).toContainText('Pendiente')
  // El toast (abajo a la derecha) tapa la columna de acciones y no se cierra con el cursor encima
  await page.mouse.move(0, 0)
  await expect(page.getByText('Invitación enviada')).toBeHidden()
}

/** Abre el enlace en un navegador sin sesión (un usuario logueado es enviado al inicio) */
async function abrirComoInvitado(browser: import('@playwright/test').Browser, link: string) {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const g = await ctx.newPage()
  await g.goto(link)
  return { g, close: () => ctx.close() }
}

test.describe('Invitaciones', () => {
  test('invitar, aceptar por el enlace del correo y entrar con el rol', async ({ page, browser }) => {
    const stamp = Date.now()
    const email = `e2e-inv-${stamp}@test.local`
    await invitar(page, email, 'usuario')

    // El correo real (react-email) llega a MailDev con el enlace
    const mail = await waitForMail(email)
    expect(mail.subject).toContain('Invitación')
    const link = linkFrom(mail, '/invitacion')

    // La persona invitada, sin sesión, abre el enlace y crea su cuenta
    const { g, close } = await abrirComoInvitado(browser, link)
    await expect(g.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible()
    await expect(g.getByText(email)).toBeVisible()
    await g.getByLabel(/^Usuario/).fill(`e2e_inv_${stamp}`)
    await g
      .getByLabel(/^Contraseña/, { exact: false })
      .first()
      .fill(PASSWORD)
    await g.getByLabel(/^Confirmar contraseña/).fill(PASSWORD)
    await g.getByRole('button', { name: 'Crear cuenta' }).click()
    await g.waitForURL(url => url.pathname === '/')

    // Cuenta verificada y con el rol de la invitación
    const db = openDb()
    try {
      const user = db
        .prepare(
          'SELECT u.email_verified_at v, r.name role FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE u.email = ?',
        )
        .get(email) as { v: string | null; role: string }
      expect(user.role).toBe('usuario')
      expect(user.v).not.toBeNull()
    } finally {
      db.close()
    }

    await close()

    // El enlace ya no sirve
    const again = await abrirComoInvitado(browser, link)
    await expect(again.g.getByRole('heading', { name: 'Invitación no válida' })).toBeVisible()
    await again.close()

    await page.reload()
    await expect(row(page, email)).toContainText('Aceptada')
  })

  test('revocar deja el enlace sin efecto', async ({ page, browser }) => {
    const email = `e2e-rev-${Date.now()}@test.local`
    await invitar(page, email, 'usuario')
    const link = linkFrom(await waitForMail(email), '/invitacion')

    await row(page, email).getByTitle('Revocar').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Revocar' }).click()
    await expect(row(page, email)).toHaveCount(0)

    const { g, close } = await abrirComoInvitado(browser, link)
    await expect(g.getByRole('heading', { name: 'Invitación no válida' })).toBeVisible()
    await close()
  })

  test('no se puede invitar a un correo ya registrado', async ({ page }) => {
    await page.goto('/usuarios/invitaciones')
    await page.getByLabel(/^Correo electrónico/).fill('admin@ejemplo.com')
    await page.getByRole('button', { name: 'Enviar invitación' }).click()
    await expect(page.getByText('Ya existe un usuario con este correo')).toBeVisible()
  })
})

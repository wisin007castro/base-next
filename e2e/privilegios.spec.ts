import { expect, test } from '@playwright/test'
import { openDb, readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'

const userId = () => {
  const db = openDb()
  try {
    return (db.prepare('SELECT id FROM users WHERE email = ?').get(readUsers().user.email) as { id: number }).id
  } finally {
    db.close()
  }
}

test.describe.serial('Privilegios por usuario', () => {
  test.afterAll(() => {
    const db = openDb()
    db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId())
    db.close()
  })

  test('conceder, denegar, caducar y quitar', async ({ page, browser }) => {
    const { user } = readUsers()
    const id = userId()

    // Sesión del usuario (rol "usuario": sin categorias.view)
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const u = await ctx.newPage()
    await login(u, user.email, user.password)
    await expectLoggedIn(u)
    expect((await u.request.get('/api/categorias')).status()).toBe(403)

    // El admin le concede categorias.view
    await page.goto(`/usuarios/${id}/editar`)
    await page.getByRole('combobox', { name: /^Permiso/ }).selectOption({ label: 'categorias.view' })
    await page.getByLabel(/^Motivo/).fill('e2e: soporte temporal')
    await page.getByRole('button', { name: 'Guardar privilegio' }).click()
    await expect(page.getByText('Privilegio guardado')).toBeVisible()
    const list = page.getByRole('list', { name: 'Privilegios del usuario' })
    await expect(list.getByRole('listitem').filter({ hasText: 'categorias.view' })).toContainText('Concede')
    await expect(page.getByLabel('Permisos efectivos')).toContainText('categorias.view')

    // Aplica sin volver a iniciar sesión
    expect((await u.request.get('/api/categorias')).status()).toBe(200)

    // Denegar un permiso que da su rol lo quita de los efectivos
    await page.getByRole('combobox', { name: /^Permiso/ }).selectOption({ label: 'users.view' })
    await page.getByLabel(/^Efecto/).selectOption({ label: 'Denegar' })
    await page.getByRole('button', { name: 'Guardar privilegio' }).click()
    await expect(list.getByRole('listitem').filter({ hasText: 'users.view' })).toContainText('Deniega')
    await expect(page.getByLabel('Permisos efectivos')).not.toContainText('users.view')

    // Caducado: deja de contar
    const db = openDb()
    db.prepare(
      "UPDATE user_permissions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE user_id = ? AND permission_id = (SELECT id FROM permissions WHERE name = 'categorias.view')",
    ).run(id)
    db.close()
    expect((await u.request.get('/api/categorias')).status()).toBe(403)
    await page.reload()
    await expect(list.getByRole('listitem').filter({ hasText: 'categorias.view' })).toContainText('Caducado')

    // Quitar el privilegio con confirmación
    await list.getByRole('listitem').filter({ hasText: 'users.view' }).getByTitle('Quitar privilegio').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar' }).click()
    await expect(list.getByRole('listitem').filter({ hasText: 'users.view' })).toHaveCount(0)
    await expect(page.getByLabel('Permisos efectivos')).toContainText('users.view')

    await ctx.close()
  })

  test('no se acepta una caducidad pasada', async ({ request }) => {
    const res = await request.post(`/api/users/${userId()}/permissions`, {
      data: { permission_id: 1, effect: 'grant', expires_on: '2000-01-01' },
    })
    expect(res.status()).toBe(422)
    expect(JSON.stringify(await res.json())).toContain('La fecha no puede ser pasada')
  })
})

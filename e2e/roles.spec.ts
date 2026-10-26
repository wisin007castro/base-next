import { expect, test } from '@playwright/test'

// Nombre de rol: solo minúsculas y guiones bajos (sin dígitos)
const randomName = () =>
  'zze_rol_' + Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')

test('roles: eliminar desde la tabla (modo client) con confirmación', async ({ page, request }) => {
  const name = randomName()
  const res = await request.post('/api/roles', { data: { name } })
  expect(res.ok(), await res.text()).toBeTruthy()

  await page.goto('/roles')
  await page.getByRole('searchbox', { name: 'Buscar roles...' }).fill(name)
  const row = page.getByRole('row').filter({ hasText: name })
  // Abrir el diálogo cambia estado en la tabla: antes congelaba la página (bucle de autoReset)
  await row.getByTitle('Eliminar').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(name)
  await dialog.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Rol eliminado')).toBeVisible()
  await expect(row).toHaveCount(0)
})

import { expect, test } from '@playwright/test'
import { readUsers } from './support/db'

test('usuarios: el listado filtra por búsqueda en la URL', async ({ page }) => {
  const { user } = readUsers()
  await page.goto('/usuarios')
  await page
    .getByRole('searchbox', { name: /Buscar/ })
    .first()
    .fill(user.email)
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByRole('row').filter({ hasText: user.email })).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(2) // cabecera + el usuario
})

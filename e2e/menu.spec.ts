import { expect, test } from '@playwright/test'

const activeLinks = (page: import('@playwright/test').Page) => page.locator('aside a[aria-current="page"]')

test.describe('Menú lateral', () => {
  test('en el inicio solo "Home" está activo', async ({ page }) => {
    await page.goto('/')
    await expect(activeLinks(page)).toHaveCount(1)
    await expect(activeLinks(page)).toHaveText('Home')
  })

  test('las subpáginas marcan su módulo', async ({ page }) => {
    await page.goto('/categorias/nuevo')
    await expect(activeLinks(page)).toHaveText('Categorías')
  })

  test('el grupo se abre solo si estás dentro de una de sus páginas', async ({ page }) => {
    await page.goto('/roles')
    await expect(activeLinks(page)).toHaveText('Roles')
    await expect(page.locator('aside').getByRole('link', { name: 'Usuarios' })).toBeVisible()
  })
})

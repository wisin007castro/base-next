import { expect, type Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

export async function expectLoggedIn(page: Page) {
  await page.waitForURL(url => url.pathname === '/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

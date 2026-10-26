import { expect, test } from '@playwright/test'

test.describe('Perfil', () => {
  test('sesiones activas: marca la actual y muestra el último acceso', async ({ page }) => {
    await page.goto('/perfil')
    await expect(page.getByText('Sesión actual')).toBeVisible()
    await expect(page.getByText(/Último acceso:/).first()).toBeVisible()
  })

  test('datos personales: crear el perfil', async ({ page }) => {
    await page.goto('/perfil')
    await page.getByLabel(/^Nombre/).fill('Prueba')
    await page.getByLabel(/^Primer apellido/).fill('E2E')
    await page.getByLabel(/^Tipo de documento/).selectOption({ label: 'DNI' })
    await page.getByLabel(/^Número de documento/).fill(`E2E-${Date.now()}`)
    await page.getByLabel(/^Fecha de nacimiento/).fill('1990-01-01')
    await page.getByRole('button', { name: 'Actualizar datos personales' }).click()
    await expect(page.getByText('Datos personales actualizados')).toBeVisible()
  })

  test('cambiar contraseña exige la actual correcta', async ({ page }) => {
    await page.goto('/perfil')
    await page.getByLabel(/^Nueva contraseña/).fill('OtraClave123')
    await page.getByLabel(/^Confirmar contraseña/).fill('OtraClave123')
    await page.getByLabel(/^Contraseña actual/).fill('incorrecta')
    await page.getByRole('button', { name: 'Actualizar cuenta' }).click()
    await expect(page.getByText('La contraseña actual es incorrecta')).toBeVisible()
  })
})

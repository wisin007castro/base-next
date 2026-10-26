import { expect, test } from '@playwright/test'
import { generate } from 'otplib'
import { readUsers } from './support/db'

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

  test('datos personales: el documento de otro usuario se rechaza', async ({ page }) => {
    const { user } = readUsers()
    await page.goto('/perfil')
    await page.getByLabel(/^Nombre/).fill('Prueba')
    await page.getByLabel(/^Primer apellido/).fill('E2E')
    await page.getByLabel(/^Tipo de documento/).selectOption({ label: 'DNI' })
    await page.getByLabel(/^Número de documento/).fill(user.documento)
    await page.getByLabel(/^Fecha de nacimiento/).fill('1990-01-01')
    await page.getByRole('button', { name: 'Actualizar datos personales' }).click()
    await expect(page.getByText('Este documento ya está registrado')).toBeVisible()
  })

  test('2FA: configurar, rechazar código erróneo, activar y desactivar', async ({ page }) => {
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Configurar 2FA' }).click()
    await expect(page.getByRole('img', { name: 'QR Code para 2FA' })).toBeVisible()
    const secret = (await page.locator('code').first().textContent())!.trim()

    const codigo = page.getByLabel(/^Código de verificación/)
    await codigo.fill('000000')
    await page.getByRole('button', { name: 'Activar 2FA' }).click()
    await expect(page.getByText('Código incorrecto')).toBeVisible()

    await codigo.fill(await generate({ secret }))
    await page.getByRole('button', { name: 'Activar 2FA' }).click()
    await expect(page.getByText('2FA activado correctamente')).toBeVisible()
    await expect(page.getByText('2FA activo', { exact: true })).toBeVisible()

    // Desactivar (deja al admin de pruebas como estaba)
    await page.getByRole('button', { name: 'Desactivar 2FA' }).click()
    await page.getByLabel(/^Contraseña actual/).fill('incorrecta')
    await page.getByRole('button', { name: 'Confirmar desactivación' }).click()
    await expect(page.getByText('Contraseña incorrecta')).toBeVisible()
    await page.getByLabel(/^Contraseña actual/).fill(readUsers().admin.password)
    await page.getByRole('button', { name: 'Confirmar desactivación' }).click()
    await expect(page.getByText('2FA desactivado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configurar 2FA' })).toBeVisible()
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

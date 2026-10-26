import { expect, test, type Page } from '@playwright/test'
import { PREFIX } from './support/db'

const row = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })
const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Buscar...' })
const nombreInput = (page: Page) => page.getByLabel(/^Nombre/)

/** Busca y espera a que el debounce lleve el texto a la URL (cambiar filtros limpia la selección). */
async function buscar(page: Page, text: string) {
  await searchBox(page).fill(text)
  await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(text).replace(/%20/g, '(\\+|%20)')}`))
}

async function crear(page: Page, nombre: string) {
  await page.goto('/categorias/nuevo')
  await nombreInput(page).fill(nombre)
  await page.getByRole('button', { name: 'Crear categoría' }).click()
  await page.waitForURL(url => url.pathname === '/categorias')
}

test.describe('Categorías (CRUD generado con soft delete)', () => {
  test('crear, buscar, editar, eliminar, restaurar y borrar definitivamente', async ({ page }) => {
    const nombre = `${PREFIX}cat ${Date.now()}`
    await crear(page, nombre)

    // Búsqueda: queda en la URL y sobrevive a recargar
    await buscar(page, nombre)
    await page.reload()
    await expect(searchBox(page)).toHaveValue(nombre)
    await expect(row(page, nombre)).toBeVisible()

    // Editar
    await row(page, nombre).getByTitle('Editar').click()
    const editado = `${nombre} v2`
    await nombreInput(page).fill(editado)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await page.waitForURL(url => url.pathname === '/categorias')
    await buscar(page, editado)
    await expect(row(page, editado)).toBeVisible()

    // Eliminar (soft) con confirmación
    const dialog = page.getByRole('dialog')
    await row(page, editado).getByTitle('Eliminar', { exact: true }).click()
    await expect(dialog).toContainText(editado)
    await dialog.getByRole('button', { name: 'Eliminar' }).click()
    await expect(dialog).toBeHidden()
    await expect(row(page, editado)).toHaveCount(0)

    // Incluir eliminadas → restaurar
    // Checkbox controlado por la URL (se actualiza async): click + esperar, no .check()
    const trashed = page.getByLabel('Incluir eliminadas')
    await trashed.click()
    await expect(trashed).toBeChecked()
    await expect(page).toHaveURL(/with_trashed=true/)
    await expect(row(page, editado).getByTitle('Restaurar')).toBeVisible()
    await row(page, editado).getByTitle('Restaurar').click()
    await expect(row(page, editado).getByTitle('Editar')).toBeVisible()

    // Eliminar de nuevo y borrar definitivamente
    await row(page, editado).getByTitle('Eliminar', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Eliminar' }).click()
    await expect(dialog).toBeHidden()
    await row(page, editado).getByTitle('Eliminar definitivamente').click()
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
    await expect(row(page, editado)).toHaveCount(0)
  })

  test('validación: nombre obligatorio y único', async ({ page }) => {
    const nombre = `${PREFIX}unica ${Date.now()}`
    await page.goto('/categorias/nuevo')
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(page.getByText('Este campo es obligatorio')).toBeVisible()

    await crear(page, nombre)
    await page.goto('/categorias/nuevo')
    await nombreInput(page).fill(nombre)
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(page.getByText('Ya existe un registro con este valor')).toBeVisible()
  })

  test('acciones en lote: seleccionar y eliminar varias', async ({ page }) => {
    const base = `${PREFIX}lote ${Date.now()}`
    await crear(page, `${base} A`)
    await crear(page, `${base} B`)
    await buscar(page, base)
    await expect(row(page, base)).toHaveCount(2)

    await page.getByRole('checkbox', { name: 'Seleccionar todos' }).check()
    const bar = page.getByRole('toolbar', { name: 'Acciones en lote' })
    await expect(bar).toContainText('2 seleccionados')
    await bar.getByRole('button', { name: 'Eliminar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await expect(row(page, base)).toHaveCount(0)
    await expect(bar).toBeHidden()
  })
})

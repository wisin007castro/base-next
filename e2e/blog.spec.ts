import { expect, test } from '@playwright/test'
import { PREFIX } from './support/db'

test.describe('Blog', () => {
  let postId: number
  let titulo: string

  test.beforeEach(async ({ request }) => {
    // Datos por API (la UI de alta ya se prueba en categorías)
    const stamp = Date.now()
    const cat = await request.post('/api/categorias', { data: { nombre: `${PREFIX}blog ${stamp}` } })
    expect(cat.ok(), await cat.text()).toBeTruthy()
    titulo = `${PREFIX}post ${stamp}`
    const post = await request.post('/api/publicaciones', {
      data: { titulo, contenido: 'Contenido de prueba', categoria_id: (await cat.json()).id, publicada: true },
    })
    expect(post.ok(), await post.text()).toBeTruthy()
    postId = (await post.json()).id
  })

  test('la publicación aparece en el listado y abre el detalle', async ({ page }) => {
    await page.goto('/blog')
    await page.getByRole('searchbox', { name: 'Buscar publicaciones...' }).fill(titulo)
    await expect(page).toHaveURL(/search=/)
    await page.getByRole('link', { name: titulo }).first().click()
    await expect(page).toHaveURL(new RegExp(`/blog/${postId}$`))
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
  })

  test('votar, cambiar y quitar el voto', async ({ page }) => {
    await page.goto(`/blog/${postId}`)
    const votos = page.getByRole('group', { name: 'Votar publicación' }).first()
    const up = votos.getByTitle('A favor')
    const down = votos.getByTitle('En contra')

    // Esperar al PUT: recargar antes lo cancelaría
    const voto = page.waitForResponse(r => r.url().endsWith(`/api/blog/${postId}/voto`) && r.ok())
    await up.click()
    await voto
    await expect(up).toHaveAttribute('aria-pressed', 'true')
    await expect(votos).toHaveText('1')

    // Persiste tras recargar (no era solo la actualización optimista)
    await page.reload()
    await expect(up).toHaveAttribute('aria-pressed', 'true')
    await expect(votos).toHaveText('1')

    await down.click()
    await expect(votos).toHaveText('-1')
    await down.click()
    await expect(down).toHaveAttribute('aria-pressed', 'false')
    await expect(votos).toHaveText('0')
  })

  test('comentar y borrar el comentario', async ({ page }) => {
    await page.goto(`/blog/${postId}`)
    const texto = `Comentario e2e ${Date.now()}`
    const caja = page.getByLabel('Deja un comentario')
    await caja.fill(texto)
    await page.getByRole('button', { name: 'Comentar' }).click()
    const comentarios = page.locator('#comentarios')
    await expect(comentarios.getByText(texto)).toBeVisible()
    await expect(caja).toHaveValue('')

    await comentarios.getByTitle('Eliminar comentario').first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await expect(comentarios.getByText(texto)).toHaveCount(0)
  })
})

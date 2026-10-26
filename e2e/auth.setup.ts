import { test as setup } from '@playwright/test'
import { readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'

// En `next dev` cada página se compila la primera vez que se visita (hasta ~10 s las pesadas):
// visitarlas aquí evita que esa espera caiga dentro del tiempo de una prueba. En CI (build de
// producción) no hace falta.
const WARM_UP = ['/configuracion', '/usuarios', '/usuarios/invitaciones', '/perfil', '/categorias', '/blog', '/roles']

setup('sesión de admin', async ({ page }) => {
  setup.setTimeout(240_000)
  const { admin } = readUsers()
  await login(page, admin.email, admin.password)
  await expectLoggedIn(page)
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })

  if (!process.env.CI) {
    for (const path of WARM_UP) await page.goto(path, { waitUntil: 'networkidle' })
  }
})

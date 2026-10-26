import { test as setup } from '@playwright/test'
import { readUsers } from './support/db'
import { expectLoggedIn, login } from './support/login'

setup('sesión de admin', async ({ page }) => {
  const { admin } = readUsers()
  await login(page, admin.email, admin.password)
  await expectLoggedIn(page)
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})

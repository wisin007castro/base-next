import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3005'

/**
 * Pruebas e2e contra `next dev` y dev.db.
 * global-setup crea usuarios desechables (e2e-*@test.local); global-teardown los borra junto con
 * los datos de prueba (prefijo "e2e "). No toca a los usuarios reales.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // Comparten dev.db y la sesión del admin: en serie es más predecible
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  // next dev compila cada página la primera vez que se visita
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: 'es-ES',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  // Local: el dev de siempre (se reutiliza si ya corre). CI: build de producción, sin compilar
  // páginas bajo demanda en mitad de las pruebas (más rápido y es lo que se despliega)
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 120_000,
  },
})

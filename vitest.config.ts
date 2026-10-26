import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Pruebas unitarias (lógica pura y servidor) en Node. La UI se prueba con Playwright (e2e/) y se
 * documenta en Storybook. Cada archivo tiene su propia SQLite en memoria con las migraciones
 * reales (vitest.setup.ts): nunca se toca dev.db.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**', '.next-dev/**'],
    setupFiles: ['./vitest.setup.ts'],
    env: {
      AUTH_SECRET: 'vitest-secret-only-for-unit-tests-0123456789',
      DATABASE_URL: ':memory:',
      LOG_LEVEL: 'silent',
    },
  },
})

import { createRequire } from 'node:module'
import type { StorybookConfig } from '@storybook/nextjs-vite'

const require = createRequire(import.meta.url)

/** Catálogo de componentes: `npm run storybook` (puerto 6008, del registro de puertos) */
const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  stories: ['../app/**/*.stories.@(ts|tsx)', '../lib/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  viteFinal: async cfg => {
    // El framework usa el React que trae Next (next/dist/compiled); @react-email/render importa
    // react-dom/server de node_modules, otra versión → React error #527. Misma copia para todos.
    const serverBrowser = require.resolve('next/dist/compiled/react-dom/server.browser')
    cfg.resolve ??= {}
    cfg.resolve.alias = [
      ...(Array.isArray(cfg.resolve.alias)
        ? cfg.resolve.alias
        : Object.entries(cfg.resolve.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))),
      { find: /^react-dom\/server(\.browser)?$/, replacement: serverBrowser },
    ]
    return cfg
  },
}

export default config

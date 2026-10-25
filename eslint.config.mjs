import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import pluginQuery from '@tanstack/eslint-plugin-query'

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

// eslint-config-next 15 exporta config "legacy" → se adapta con FlatCompat
const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'drizzle/migrations/**', '.claude/**', '.agents/**'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Reglas de TanStack Query: exhaustive-deps en queryKey, no rest destructuring, etc.
  ...pluginQuery.configs['flat/recommended'],
]

export default eslintConfig

'use client'
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { z } from 'zod'

type Primitive = string | number | boolean | undefined | null

/**
 * Estado tipado guardado en la query string (filtros, página, orden…).
 * Sobrevive a recargas, se puede compartir por URL y funciona con atrás/adelante.
 *
 * Cada campo del schema debe tener `.catch(default)` para que una URL inválida
 * nunca rompa la página. Los valores iguales al default no se escriben en la URL.
 *
 * Los componentes que lo usan deben estar dentro de <Suspense> (requisito de
 * useSearchParams en Next 15 para el prerender).
 */
export function useUrlState<S extends z.ZodObject>(schema: S, { pageKey = 'page' }: { pageKey?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaults = useMemo(() => schema.parse({}) as z.output<S>, [schema])
  const state = useMemo(
    () => schema.parse(Object.fromEntries(searchParams.entries())) as z.output<S>,
    [schema, searchParams],
  )

  /** Aplica un cambio parcial. Cambiar cualquier filtro vuelve a la página 1. */
  const setState = useCallback(
    (patch: Partial<Record<keyof z.output<S>, Primitive>>) => {
      const base = defaults as Record<string, Primitive>
      const next: Record<string, Primitive> = { ...(state as Record<string, Primitive>), ...patch }
      if (!(pageKey in patch) && pageKey in base) next[pageKey] = base[pageKey]

      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === null || value === '') continue
        if (value === base[key]) continue
        params.set(key, String(value))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [state, defaults, pageKey, pathname, router],
  )

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router])

  return [state, setState, reset] as const
}

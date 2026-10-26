import { enumConst, formDefault, isFilterable, toDtoValue, zodForm } from '../fields'
import { formFields, type Ctx } from './context'

// ─── lib/api/<plural>.api.ts ──────────────────────────────────────────────────
export const apiClientFile = (c: Ctx) => `import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { ${c.n.Pascal}, ${c.n.Pascal}Filters } from '@/lib/types/${c.n.kebab}.types'
import type { Create${c.n.Pascal}Input, Update${c.n.Pascal}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'

export const ${c.n.camelPlural}Api = {
  getAll: (filters: ${c.n.Pascal}Filters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<${c.n.Pascal}>>(\`/${c.n.kebabPlural}\${toQueryString(filters)}\`, { signal }),

  getById: (id: number, signal?: AbortSignal) => request<${c.n.Pascal}>(\`/${c.n.kebabPlural}/\${id}\`, { signal }),

  /** [{ value, label }] para selects (p. ej. el campo ref de otro módulo) */
  getOptions: (signal?: AbortSignal) =>
    request<{ value: number; label: string }[]>('/${c.n.kebabPlural}/options', { signal }),

  create: (dto: Create${c.n.Pascal}Input) =>
    request<${c.n.Pascal}>('/${c.n.kebabPlural}', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: Update${c.n.Pascal}Input) =>
    request<${c.n.Pascal}>(\`/${c.n.kebabPlural}/\${id}\`, { method: 'PATCH', body: JSON.stringify(dto) }),

  remove: (id: number) => request<void>(\`/${c.n.kebabPlural}/\${id}\`, { method: 'DELETE' }),

  bulkDelete: (ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/${c.n.kebabPlural}/bulk', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', ids }),
    }),
}
`

// ─── Claves de caché (se insertan en lib/constants/query-keys.ts) ─────────────
export const queryKeysSnippet = (c: Ctx) => `export const ${c.n.camel}Keys = {
  all: ['${c.n.snakePlural}'] as const,
  lists: () => [...${c.n.camel}Keys.all, 'list'] as const,
  list: (filters: object) => [...${c.n.camel}Keys.lists(), filters] as const,
  details: () => [...${c.n.camel}Keys.all, 'detail'] as const,
  detail: (id: number) => [...${c.n.camel}Keys.details(), id] as const,
  options: () => [...${c.n.camel}Keys.all, 'options'] as const,
}
`

// ─── lib/hooks/<plural>.hooks.ts ──────────────────────────────────────────────
export const hooksFile = (c: Ctx) => {
  const { Pascal: P, PascalPlural: PP, camel, camelPlural: cp } = c.n
  return `import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { ${cp}Api } from '@/lib/api/${c.n.kebabPlural}.api'
import { ${camel}Keys } from '@/lib/constants/query-keys'
import type { ${P}Filters } from '@/lib/types/${c.n.kebab}.types'
import type { Create${P}Input, Update${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'

export const ${camel}Queries = {
  list: (filters: ${P}Filters) =>
    queryOptions({
      queryKey: ${camel}Keys.list(filters),
      queryFn: ({ signal }) => ${cp}Api.getAll(filters, signal),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ${camel}Keys.detail(id),
      queryFn: ({ signal }) => ${cp}Api.getById(id, signal),
      enabled: !!id,
    }),

  options: () =>
    queryOptions({
      queryKey: ${camel}Keys.options(),
      queryFn: ({ signal }) => ${cp}Api.getOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
}

/** Lista y opciones de select quedan obsoletas tras cualquier cambio */
function useInvalidate${PP}() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ${camel}Keys.lists() })
    qc.invalidateQueries({ queryKey: ${camel}Keys.options() })
  }
}

/** Listado paginado: mantiene la página anterior mientras carga y precarga la siguiente */
export function use${PP}(filters: ${P}Filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({ ...${camel}Queries.list(filters), placeholderData: keepPreviousData })

  const page = filters.page ?? 1
  const lastPage = query.data?.last_page
  useEffect(() => {
    if (query.isPlaceholderData || !lastPage || page >= lastPage) return
    qc.prefetchQuery(${camel}Queries.list({ ...filters, page: page + 1 }))
  }, [qc, filters, page, lastPage, query.isPlaceholderData])

  return query
}

export function use${P}(id: number) {
  return useQuery(${camel}Queries.detail(id))
}

/** [{ value, label }] para selects de otros módulos */
export function use${PP}Options() {
  return useQuery(${camel}Queries.options())
}

/** Precarga el detalle (al pasar el mouse por "Editar") */
export function usePrefetch${P}() {
  const qc = useQueryClient()
  return (id: number) => qc.prefetchQuery(${camel}Queries.detail(id))
}

export function useCreate${P}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    mutationFn: (dto: Create${P}Input) => ${cp}Api.create(dto),
    onSuccess: item => {
      qc.setQueryData(${camel}Keys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useUpdate${P}(id: number) {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    mutationFn: (dto: Update${P}Input) => ${cp}Api.update(id, dto),
    onSuccess: item => {
      qc.setQueryData(${camel}Keys.detail(id), item)
      invalidate()
    },
  })
}

export function useDelete${P}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    mutationFn: (id: number) => ${cp}Api.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ${camel}Keys.detail(id) })
      invalidate()
    },
  })
}

export function useBulkDelete${PP}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    mutationFn: (ids: number[]) => ${cp}Api.bulkDelete(ids),
    onSuccess: (_, ids) => {
      ids.forEach(id => qc.removeQueries({ queryKey: ${camel}Keys.detail(id) }))
      invalidate()
    },
  })
}
`
}

// ─── lib/forms/<entity>.form.ts ───────────────────────────────────────────────
export const formSchemaFile = (c: Ctx) => {
  const P = c.n.Pascal
  const schemaVar = `create${P}Schema`
  const fields = formFields(c)
  const needsDate = fields.some(f => f.type === 'date' && f.optional)
  const optionalEnums = fields.filter(f => f.type === 'enum' && f.optional)
  return `import type { DefaultValues } from 'react-hook-form'
import { z${needsDate ? ', DATE_RE' : ''} } from '@/lib/validation/zod-config'
import { ${schemaVar}, type Create${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'
${optionalEnums.length ? `import { ${optionalEnums.map(f => enumConst(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}import type { ${P} } from '@/lib/types/${c.n.kebab}.types'

// Requeridos: la regla del servidor tal cual. Opcionales: aceptan '' / null del form.
export const ${c.n.camel}FormSchema = z.object({
${fields.map(f => `  ${f.name}: ${zodForm(f, c.n.CONST, schemaVar)},`).join('\n')}
})

export type ${P}FormValues = z.infer<typeof ${c.n.camel}FormSchema>

export const ${c.n.camel}FormDefaults = (e?: ${P}): DefaultValues<${P}FormValues> => ({
${fields.map(f => `  ${f.name}: ${formDefault(f)},`).join('\n')}
})

/** Valores del form → DTO de la API ('' de los opcionales → null) */
export const to${P}Dto = (v: ${P}FormValues): Create${P}Input => ({
${fields.map(f => `  ${f.name}: ${toDtoValue(f)},`).join('\n')}
})
`
}

// ─── lib/filters/<plural>.filters.ts ──────────────────────────────────────────
export const filtersFile = (c: Ctx) => {
  const P = c.n.Pascal
  const filterable = c.fields.filter(isFilterable)
  const enums = filterable.filter(f => f.type === 'enum')
  return `import { z } from '@/lib/validation/zod-config'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'
${enums.length ? `import { ${enums.map(f => enumConst(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}import type { ${P}Filters } from '@/lib/types/${c.n.kebab}.types'

/** Filtros del listado tal como viven en la URL (\`/${c.n.kebabPlural}?search=…&page=2\`) */
export const ${c.n.camelPlural}SearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z.coerce
    .number()
    .refine(n => PER_PAGE_OPTIONS.includes(n))
    .catch(PER_PAGE_OPTIONS[1]),
  sort: z.string().catch('-created_at'),
  search: z.string().catch(''),
${filterable
  .map(f =>
    f.type === 'boolean'
      ? `  ${f.name}: z.enum(['true', 'false']).optional().catch(undefined),`
      : f.type === 'ref'
        ? `  ${f.name}: z.coerce.number().int().positive().optional().catch(undefined),`
        : `  ${f.name}: z.enum(${enumConst(c.n.CONST, f)}).optional().catch(undefined),`,
  )
  .join('\n')}
})

export type ${c.n.PascalPlural}Search = z.output<typeof ${c.n.camelPlural}SearchSchema>

export const to${P}Filters = (s: ${c.n.PascalPlural}Search): ${P}Filters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,
${filterable.map(f => `  ${f.name}: s.${f.name},`).join('\n')}
})

export const hasAnyFilter = (s: ${c.n.PascalPlural}Search) => !!(s.search${filterable.map(f => ` || s.${f.name}`).join('')})
`
}

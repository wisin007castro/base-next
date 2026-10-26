import { enumConst, formDefault, isFilterable, toDtoValue, zodForm } from '../fields'
import { formFields, type Ctx } from './context'

// ─── lib/api/<plural>.api.ts ──────────────────────────────────────────────────
export const apiClientFile = (c: Ctx) => {
  const P = c.n.Pascal
  return `import { request, toQueryString } from './http'
import type { PaginatedResponse } from '@/lib/types/user.types'
import type { ${P}, ${P}Filters } from '@/lib/types/${c.n.kebab}.types'
import type { Bulk${P}Action, Create${P}Input, Update${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

// Mensajes de los toasts (los muestra el MutationCache global: lib/toast.ts)
const t = crudToasts('${c.n.labelSingular.charAt(0).toUpperCase() + c.n.labelSingular.slice(1)}'${c.n.fem ? ', true' : ''})

export const ${c.n.camelPlural}Api = {
  getAll: (filters: ${P}Filters = {}, signal?: AbortSignal) =>
    request<PaginatedResponse<${P}>>(\`/${c.n.kebabPlural}\${toQueryString(filters)}\`, { signal }),

  getById: (id: number, signal?: AbortSignal) => request<${P}>(\`/${c.n.kebabPlural}/\${id}\`, { signal }),

  /** [{ value, label }] para selects (p. ej. el campo ref de otro módulo) */
  getOptions: (signal?: AbortSignal) =>
    request<{ value: number; label: string }[]>('/${c.n.kebabPlural}/options', { signal }),

  create: (dto: Create${P}Input) => request<${P}>('/${c.n.kebabPlural}', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: Update${P}Input) =>
    request<${P}>(\`/${c.n.kebabPlural}/\${id}\`, { method: 'PATCH', body: JSON.stringify(dto) }),

  remove: (id: number) => request<void>(\`/${c.n.kebabPlural}/\${id}\`, { method: 'DELETE' }),
${
  c.softDelete
    ? `
  restore: (id: number) => request<${P}>(\`/${c.n.kebabPlural}/\${id}/restore\`, { method: 'POST' }),

  forceDelete: (id: number) => request<void>(\`/${c.n.kebabPlural}/\${id}/force\`, { method: 'DELETE' }),
`
    : ''
}
  bulk: (action: Bulk${P}Action, ids: number[]) =>
    request<{ affected: number; skipped: number[] }>('/${c.n.kebabPlural}/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),
}
`
}

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
import { invalidateDependents } from '@/lib/hooks/invalidate-dependents'
import type { ${P}Filters } from '@/lib/types/${c.n.kebab}.types'
import type { Bulk${P}Action, Create${P}Input, Update${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { crudToasts, bulkToast } from '@/lib/toast'

const t = crudToasts('${c.n.labelSingular.charAt(0).toUpperCase() + c.n.labelSingular.slice(1)}'${c.n.fem ? ', true' : ''})

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

/**
 * Tras cualquier cambio: listas y opciones quedan obsoletas, y también las cachés de otros
 * módulos que muestran datos de este (QUERY_DEPENDENCIES: etiquetas en joins, blog…)
 */
function useInvalidate${PP}() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ${camel}Keys.lists() })
    qc.invalidateQueries({ queryKey: ${camel}Keys.options() })
    invalidateDependents(qc, '${c.n.snakePlural}')
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
    meta: { successToast: t.created },
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
    meta: { successToast: t.updated },
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
    meta: { successToast: t.deleted },
    mutationFn: (id: number) => ${cp}Api.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ${camel}Keys.detail(id) })
      invalidate()
    },
  })
}
${
  c.softDelete
    ? `
export function useRestore${P}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    meta: { successToast: t.restored, errorToast: true },
    mutationFn: (id: number) => ${cp}Api.restore(id),
    onSuccess: item => {
      qc.setQueryData(${camel}Keys.detail(item.id), item)
      invalidate()
    },
  })
}

export function useForceDelete${P}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    meta: { successToast: t.forceDeleted, errorToast: true },
    mutationFn: (id: number) => ${cp}Api.forceDelete(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ${camel}Keys.detail(id) })
      invalidate()
    },
  })
}
`
    : ''
}
/** Acción en lote (${c.softDelete ? 'delete / restore / force_delete' : 'delete'}) */
export function useBulk${PP}() {
  const qc = useQueryClient()
  const invalidate = useInvalidate${PP}()
  return useMutation({
    meta: { successToast: bulkToast },
    mutationFn: ({ action, ids }: { action: Bulk${P}Action; ids: number[] }) => ${cp}Api.bulk(action, ids),
    onSuccess: (_, { ids }) => {
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

// Requeridos: la regla del servidor tal cual. Opcionales: aceptan '' / null / [] del form.
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
  const keys = [...filterable.map(f => f.name), ...(c.softDelete ? ['with_trashed'] : [])]
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
      : f.type === 'ref' || f.type === 'many'
        ? `  ${f.name}: z.coerce.number().int().positive().optional().catch(undefined),`
        : `  ${f.name}: z.enum(${enumConst(c.n.CONST, f)}).optional().catch(undefined),`,
  )
  .join('\n')}${c.softDelete ? `\n  with_trashed: z.enum(['true']).optional().catch(undefined),` : ''}
})

export type ${c.n.PascalPlural}Search = z.output<typeof ${c.n.camelPlural}SearchSchema>

export const to${P}Filters = (s: ${c.n.PascalPlural}Search): ${P}Filters => ({
  page: s.page,
  per_page: s.per_page,
  sort: s.sort,
  search: s.search || undefined,
${filterable.map(f => `  ${f.name}: s.${f.name},`).join('\n')}${c.softDelete ? `\n  with_trashed: s.with_trashed === 'true' || undefined,` : ''}
})

export const hasAnyFilter = (s: ${c.n.PascalPlural}Search) => !!(s.search${keys.map(k => ` || s.${k}`).join('')})
`
}

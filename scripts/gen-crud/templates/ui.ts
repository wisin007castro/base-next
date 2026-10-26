import { enumOptions, formFieldJsx, isFilterable, refOptionsVar, tableColumn, type FieldType } from '../fields'
import { displayExpr, formFields, refFields, manyFields, refModules, words, type Ctx } from './context'

const FIELD_COMPONENT: Record<FieldType, string> = {
  string: 'FieldText',
  date: 'FieldText',
  text: 'FieldTextarea',
  int: 'FieldNumber',
  number: 'FieldNumber',
  boolean: 'FieldCheckbox',
  enum: 'FieldSelect',
  ref: 'FieldSelect',
  many: 'FieldCheckboxGroup',
}

const optionsHookImports = (mods: ReturnType<typeof refModules>) =>
  mods.map(m => `import { use${m.PascalPlural}Options } from '@/lib/hooks/${m.kebabPlural}.hooks'\n`).join('')
const optionsHookCalls = (mods: ReturnType<typeof refModules>) =>
  mods.map(m => `  const { data: ${m.camelPlural}Options = [] } = use${m.PascalPlural}Options()`).join('\n')

// ─── app/components/<plural>/<Entity>Form.tsx ─────────────────────────────────
export const formComponentFile = (c: Ctx) => {
  const P = c.n.Pascal
  const fields = formFields(c)
  const components = [...new Set(fields.map(f => FIELD_COMPONENT[f.type]))].sort()
  const enums = fields.filter(f => f.type === 'enum')
  const mods = refModules(c)
  const w = words(c)
  return `'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormActions, FormSection, FormStatus, ${components.join(', ')} } from '@/app/components/form'
${enums.length ? `import { ${enums.map(f => enumOptions(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}${optionsHookImports(mods)}import {
  ${c.n.camel}FormDefaults,
  ${c.n.camel}FormSchema,
  to${P}Dto,
  type ${P}FormValues,
} from '@/lib/forms/${c.n.kebab}.form'
import type { ${P} } from '@/lib/types/${c.n.kebab}.types'
import type { Create${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'

interface Props {
  ${c.n.camel}?: ${P}
  onSubmit: (data: Create${P}Input) => Promise<unknown>
}

/** Crear (sin \`${c.n.camel}\`) o editar ${w.el} ${c.n.labelSingular} */
export function ${P}Form({ ${c.n.camel}, onSubmit }: Props) {
  const form = useForm<${P}FormValues>({
    resolver: zodResolver(${c.n.camel}FormSchema),
    defaultValues: ${c.n.camel}FormDefaults(${c.n.camel}),
  })
  const { control } = form
${optionsHookCalls(mods)}

  return (
    <Form form={form} onSubmit={values => onSubmit(to${P}Dto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos de${c.n.fem ? ' la' : 'l'} ${c.n.labelSingular}">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
${fields.map(f => `          ${formFieldJsx(f, c.n.CONST)}`).join('\n')}
        </div>
      </FormSection>
      <FormActions submitLabel={${c.n.camel} ? 'Guardar cambios' : 'Crear ${c.n.labelSingular}'} />
    </Form>
  )
}
`
}

// ─── app/components/<plural>/<Entities>Table.tsx ──────────────────────────────
export const tableComponentFile = (c: Ctx) => {
  const { Pascal: P, PascalPlural: PP, snakePlural } = c.n
  const sd = c.softDelete
  const usesYesNo = c.fields.some(f => f.type === 'boolean')
  const usesDate = c.fields.some(f => f.type === 'date')
  const enums = c.fields.filter(f => f.type === 'enum')
  const needsLink = !!c.display
  const dt = [
    'BulkActionButton',
    'BulkActionsBar',
    'ConfirmDialog',
    'DataTable',
    'createColumnHelper',
    'selectionColumn',
  ]
  if (usesYesNo) dt.push('YesNoBadge')
  if (usesDate) dt.push('formatDate')
  if (enums.length) dt.push('labelOf')
  if (manyFields(c).length) dt.push('RefBadges')
  if (sd) dt.push('DeletedBadge')
  const icons = ['FiEdit2', 'FiTrash2', ...(sd ? ['FiRotateCcw', 'FiXCircle'] : [])].sort()
  const hooks = [
    `useBulk${PP}`,
    `useDelete${P}`,
    `usePrefetch${P}`,
    ...(sd ? [`useForceDelete${P}`, `useRestore${P}`] : []),
  ].sort()
  const w = words(c)
  const label = c.n.label.toLowerCase()

  const deletedActions = `
          {item.deleted_at ? (
            <>
              {canDelete && (
                <button
                  onClick={() => restore.mutate(item.id)}
                  disabled={restore.isPending}
                  title="Restaurar"
                  className={\`\${iconBtn} text-ok hover:bg-[var(--ok-bg)]\`}
                >
                  <FiRotateCcw className="h-4 w-4" />
                </button>
              )}
              {canForceDelete && (
                <button
                  onClick={() => setToForceDelete(item)}
                  title="Eliminar definitivamente"
                  className={\`\${iconBtn} text-risk hover:bg-[var(--risk-bg)]\`}
                >
                  <FiXCircle className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>`

  return `'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ${icons.join(', ')} } from 'react-icons/fi'
import type { ${P} } from '@/lib/types/${c.n.kebab}.types'
import type { Bulk${P}Action } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { ${dt.sort().join(', ')}, type RowSelectionState } from '@/app/components/data-table'
${enums.length ? `import { ${enums.map(f => enumOptions(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}import { ${hooks.join(', ')} } from '@/lib/hooks/${c.n.kebabPlural}.hooks'
import { useCan } from '@/lib/hooks/use-can'

interface Props {
  items: ${P}[] | undefined
  isLoading?: boolean
  isError?: boolean
  isStale?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  /** Al cambiar (filtros, página…) se limpia la selección */
  selectionResetKey?: string
}

const iconBtn = 'rounded p-1.5 transition-colors disabled:opacity-50'
const col = createColumnHelper<${P}>()

const BULK_TEXT: Record<Bulk${P}Action, { title: string; label: string; body: string }> = {
  delete: { title: 'Eliminar ${label}', label: 'Eliminar', body: '${sd ? 'Podrás restaurarlos desde "Incluir eliminados".' : 'Esta acción no se puede deshacer.'}' },${
    sd
      ? `
  restore: { title: 'Restaurar ${label}', label: 'Restaurar', body: 'Volverán a estar activos.' },
  force_delete: {
    title: 'Eliminar definitivamente',
    label: 'Eliminar definitivamente',
    body: 'Solo se borran los ya eliminados. No se puede deshacer.',
  },`
      : ''
  }
}

export function ${PP}Table({ items, selectionResetKey, ...tableProps }: Props) {
  const canEdit = useCan('${snakePlural}.edit')
  const canDelete = useCan('${snakePlural}.delete')${sd ? `\n  const canForceDelete = useCan('${snakePlural}.force_delete')` : ''}
  const remove = useDelete${P}()${sd ? `\n  const restore = useRestore${P}()\n  const forceDelete = useForceDelete${P}()` : ''}
  const bulk = useBulk${PP}()
  const prefetch = usePrefetch${P}()

  const [toDelete, setToDelete] = useState<${P} | null>(null)${sd ? `\n  const [toForceDelete, setToForceDelete] = useState<${P} | null>(null)` : ''}
  const [pendingBulk, setPendingBulk] = useState<Bulk${P}Action | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Limpiar la selección cuando cambian filtros/página (sin efecto)
  const [prevResetKey, setPrevResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevResetKey) {
    setPrevResetKey(selectionResetKey)
    setRowSelection({})
  }

  const selected = (items ?? []).filter(i => rowSelection[String(i.id)])${
    sd
      ? `
  const anyDeleted = selected.some(i => i.deleted_at)
  const anyAlive = selected.some(i => !i.deleted_at)`
      : ''
  }
${
  needsLink
    ? `
  const editLinkProps = (item: ${P}) => ({
    href: \`/${c.n.kebabPlural}/\${item.id}/editar\`,
    onMouseEnter: () => prefetch(item.id),
    onFocus: () => prefetch(item.id),
  })
`
    : ''
}
  const columns = [
    ...(canDelete ? [selectionColumn<${P}>()] : []),
    col.accessor('id', { header: '#', meta: { className: 'text-ink-3' } }),
${c.fields.map(f => `    ${tableColumn(f, c.n.CONST, f === c.display)},`).join('\n')}${
    sd
      ? `
    col.display({ id: 'estado', header: 'Estado', cell: ({ row }) => (row.original.deleted_at ? <DeletedBadge /> : null) }),`
      : ''
  }
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: item } }) => (
        <div className="flex items-center justify-end gap-1">${sd ? deletedActions : ''}
          {canEdit && (
            <Link
              href={\`/${c.n.kebabPlural}/\${item.id}/editar\`}
              onMouseEnter={() => prefetch(item.id)}
              onFocus={() => prefetch(item.id)}
              title="Editar"
              className={\`\${iconBtn} text-accent hover:bg-[var(--accent-subtle)]\`}
            >
              <FiEdit2 className="h-4 w-4" />
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setToDelete(item)}
              title="Eliminar"
              className={\`\${iconBtn} text-risk hover:bg-[var(--risk-bg)]\`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          )}${sd ? '\n            </>\n          )}' : ''}
        </div>
      ),
    }),
  ]

  const bulkText = pendingBulk ? BULK_TEXT[pendingBulk] : null

  return (
    <div className="space-y-3">
      <BulkActionsBar count={selected.length} onClear={() => setRowSelection({})}>${
        sd
          ? `
        {anyAlive && (
          <BulkActionButton onClick={() => setPendingBulk('delete')} tone="danger" icon={<FiTrash2 className="h-4 w-4" />}>
            Eliminar
          </BulkActionButton>
        )}
        {anyDeleted && (
          <BulkActionButton onClick={() => setPendingBulk('restore')} icon={<FiRotateCcw className="h-4 w-4" />}>
            Restaurar
          </BulkActionButton>
        )}
        {anyDeleted && canForceDelete && (
          <BulkActionButton
            onClick={() => setPendingBulk('force_delete')}
            tone="danger"
            icon={<FiXCircle className="h-4 w-4" />}
          >
            Eliminar definitivamente
          </BulkActionButton>
        )}`
          : `
        <BulkActionButton onClick={() => setPendingBulk('delete')} tone="danger" icon={<FiTrash2 className="h-4 w-4" />}>
          Eliminar
        </BulkActionButton>`
      }
      </BulkActionsBar>

      <DataTable
        mode="server"
        columns={columns}
        data={items}
        getRowId={i => String(i.id)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableRowSelection={canDelete}
        errorMessage="Error al cargar ${w.el === 'la' ? 'las' : 'los'} ${label}."
        emptyMessage="No se encontraron ${label}."
        {...tableProps}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar ${c.n.labelSingular}"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar ${w.el} ${c.n.labelSingular} <strong className="text-ink-1">{toDelete && ${displayExpr(c, 'toDelete')}}</strong>?${sd ? ' Podrás restaurarl' + (c.n.fem ? 'a' : 'o') + ' después.' : ' Esta acción no se puede deshacer.'}
      </ConfirmDialog>
${
  sd
    ? `
      <ConfirmDialog
        open={!!toForceDelete}
        title="Eliminar definitivamente"
        confirmLabel="Eliminar definitivamente"
        isPending={forceDelete.isPending}
        error={forceDelete.error?.message}
        onCancel={() => {
          setToForceDelete(null)
          forceDelete.reset()
        }}
        onConfirm={() =>
          toForceDelete && forceDelete.mutate(toForceDelete.id, { onSuccess: () => setToForceDelete(null) })
        }
      >
        ¿Borrar para siempre <strong className="text-ink-1">{toForceDelete && ${displayExpr(c, 'toForceDelete')}}</strong>? No se puede
        deshacer.
      </ConfirmDialog>
`
    : ''
}
      <ConfirmDialog
        open={!!bulkText}
        title={bulkText?.title ?? ''}
        confirmLabel={bulkText?.label}
        isPending={bulk.isPending}
        error={bulk.error?.message}
        onCancel={() => {
          setPendingBulk(null)
          bulk.reset()
        }}
        onConfirm={() =>
          pendingBulk &&
          bulk.mutate(
            { action: pendingBulk, ids: selected.map(i => i.id) },
            {
              onSuccess: () => {
                setPendingBulk(null)
                setRowSelection({})
              },
            },
          )
        }
      >
        Se aplicará a <strong className="text-ink-1">{selected.length}</strong> registro(s). {bulkText?.body}
      </ConfirmDialog>
    </div>
  )
}
`
}

// ─── app/<plural>/page.tsx ────────────────────────────────────────────────────
export const listPageFile = (c: Ctx) => {
  const { Pascal: P, PascalPlural: PP, camel, camelPlural: cp } = c.n
  const filterable = c.fields.filter(isFilterable)
  const enums = filterable.filter(f => f.type === 'enum')
  const mods = refModules(
    c,
    filterable.filter(f => f.type === 'ref' || f.type === 'many'),
  )
  const dtImports = ['DataTablePagination', 'FilterBar', 'SearchFilter']
  if (filterable.length) dtImports.push('SelectFilter')
  if (c.softDelete) dtImports.push('ToggleFilter')
  const w = words(c)

  const filterJsx = filterable
    .map(f => {
      if (f.type === 'boolean') {
        return `        <SelectFilter
          value={search.${f.name} ?? ''}
          onChange={value => setSearch({ ${f.name}: value })}
          allLabel="${f.label}: todos"
          options={[
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
          ]}
        />`
      }
      if (f.type === 'ref' || f.type === 'many') {
        return `        <SelectFilter
          value={search.${f.name} ? String(search.${f.name}) : ''}
          onChange={value => setSearch({ ${f.name}: value })}
          allLabel="Cualquier ${f.label.toLowerCase()}"
          options={${refOptionsVar(f)}.map(o => ({ value: String(o.value), label: o.label }))}
        />`
      }
      return `        <SelectFilter
          value={search.${f.name} ?? ''}
          onChange={value => setSearch({ ${f.name}: value })}
          allLabel="${f.label}: todos"
          options={[...${enumOptions(c.n.CONST, f)}]}
        />`
    })
    .join('\n')

  return `'use client'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { use${PP}, ${camel}Queries } from '@/lib/hooks/${c.n.kebabPlural}.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCan } from '@/lib/hooks/use-can'
import { hasAnyFilter, ${cp}SearchSchema, to${P}Filters } from '@/lib/filters/${c.n.kebabPlural}.filters'
${enums.length ? `import { ${enums.map(f => enumOptions(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}${optionsHookImports(mods)}import { ${PP}Table } from '@/app/components/${c.n.kebabPlural}/${PP}Table'
import { ${dtImports.join(', ')} } from '@/app/components/data-table'

function ${PP}Content() {
  const qc = useQueryClient()
  const canCreate = useCan('${c.n.snakePlural}.create')${c.softDelete ? `\n  const canDelete = useCan('${c.n.snakePlural}.delete')` : ''}
  const [search, setSearch, resetSearch] = useUrlState(${cp}SearchSchema)
  const filters = useMemo(() => to${P}Filters(search), [search])
  const { data, isLoading, isError, isPlaceholderData } = use${PP}(filters)
${optionsHookCalls(mods)}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">${c.n.label}</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {data ? \`\${data.total} ${c.n.label.toLowerCase()} ${w.registrados}\` : 'Gestión de ${c.n.label.toLowerCase()}'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/${c.n.kebabPlural}/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="h-4 w-4" />
            ${w.nuevo} ${c.n.labelSingular}
          </Link>
        )}
      </div>

      <FilterBar hasActive={hasAnyFilter(search)} onClear={resetSearch}>
        <SearchFilter value={search.search} onChange={value => setSearch({ search: value })} placeholder="Buscar..." />
${filterJsx}${
    c.softDelete
      ? `
        {canDelete && (
          <ToggleFilter
            checked={!!search.with_trashed}
            onChange={checked => setSearch({ with_trashed: checked ? 'true' : undefined })}
            label="Incluir ${w.eliminados}"
          />
        )}`
      : ''
  }
      </FilterBar>

      <${PP}Table
        items={data?.data}
        isLoading={isLoading}
        isError={isError}
        isStale={isPlaceholderData}
        sort={search.sort}
        onSortChange={sort => setSearch({ sort })}
        selectionResetKey={JSON.stringify(filters)}
      />

      {data && (
        <DataTablePagination
          page={search.page}
          lastPage={data.last_page}
          total={data.total}
          from={data.from}
          to={data.to}
          perPage={search.per_page}
          onPageChange={page => setSearch({ page })}
          onPerPageChange={per_page => setSearch({ per_page })}
          onPageHover={page => qc.prefetchQuery(${camel}Queries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function ${PP}Page() {
  return (
    <Suspense>
      <${PP}Content />
    </Suspense>
  )
}
`
}

// ─── app/<plural>/nuevo/page.tsx ──────────────────────────────────────────────
export const newPageFile = (c: Ctx) => {
  const P = c.n.Pascal
  const w = words(c)
  return `'use client'
import { useRouter } from 'next/navigation'
import { useCreate${P} } from '@/lib/hooks/${c.n.kebabPlural}.hooks'
import { ${P}Form } from '@/app/components/${c.n.kebabPlural}/${P}Form'
import type { Create${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'

export default function ${w.nuevo}${P}Page() {
  const router = useRouter()
  const create = useCreate${P}()

  async function handleSubmit(data: Create${P}Input) {
    await create.mutateAsync(data)
    router.push('/${c.n.kebabPlural}')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">${w.nuevo} ${c.n.labelSingular}</h1>
        <p className="mt-0.5 text-sm text-ink-3">Completa los datos para crear ${c.n.fem ? 'una nueva' : 'un nuevo'} ${c.n.labelSingular}.</p>
      </div>
      <${P}Form onSubmit={handleSubmit} />
    </div>
  )
}
`
}

// ─── app/<plural>/[id]/editar/page.tsx ────────────────────────────────────────
export const editPageFile = (c: Ctx) => {
  const P = c.n.Pascal
  const camel = c.n.camel
  return `'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { use${P}, useUpdate${P} } from '@/lib/hooks/${c.n.kebabPlural}.hooks'
import { ${P}Form } from '@/app/components/${c.n.kebabPlural}/${P}Form'
import type { Create${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'

export default function Editar${P}Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ${camel}Id = Number(id)
  const router = useRouter()

  const { data: ${camel}, isLoading, isError } = use${P}(${camel}Id)
  const update = useUpdate${P}(${camel}Id)

  async function handleSubmit(data: Create${P}Input) {
    await update.mutateAsync(data)
    router.push('/${c.n.kebabPlural}')
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-ink-3">Cargando…</div>
  if (isError || !${camel}) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
        No se encontró ${words(c).el} ${c.n.labelSingular}${c.softDelete ? ' (si está eliminad' + (c.n.fem ? 'a' : 'o') + ', restáurel' + (c.n.fem ? 'a' : 'o') + ' primero)' : ''}.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Editar ${c.n.labelSingular}</h1>
        <p className="mt-0.5 text-sm text-ink-3">{${displayExpr(c, camel)}}</p>
      </div>
      <${P}Form ${camel}={${camel}} onSubmit={handleSubmit} />
    </div>
  )
}
`
}

// ─── Entradas en archivos existentes ──────────────────────────────────────────
export const menuEntry = (c: Ctx) => `  {
    id: '${c.n.kebabPlural}',
    label: '${c.n.label}',
    href: '/${c.n.kebabPlural}',
    icon: HiOutlineViewGrid,
    permission: '${c.n.snakePlural}.view',
  },
`

/** Destinos de ref/many (por prefijo): para permisos de /options e invalidación de caché */
export const refTargets = (c: Ctx) => [
  ...new Set([...refFields(c), ...manyFields(c)].filter(f => f.ref!.module).map(f => f.ref!.plural)),
]

export const moduleEntry = (c: Ctx) => {
  const refs = refTargets(c)
  const extra = [
    refs.length ? `refs: [${refs.map(r => `'${r}'`).join(', ')}]` : '',
    c.softDelete ? 'softDelete: true' : '',
  ].filter(Boolean)
  return `  { path: '/${c.n.kebabPlural}', prefix: '${c.n.snakePlural}', label: '${c.n.label}'${extra.length ? `, ${extra.join(', ')}` : ''} },\n`
}

/** lib/constants/query-dependencies.ts: [destino, este módulo] por cada ref/many (y el autor) */
export const dependencyEntries = (c: Ctx) =>
  [...refTargets(c), ...(c.fields.some(f => f.owner) ? ['users'] : [])]
    .map(target => `  ['${target}', '${c.n.snakePlural}'],\n`)
    .join('')

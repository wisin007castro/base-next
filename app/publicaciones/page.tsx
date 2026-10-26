'use client'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { usePublicaciones, publicacionQueries } from '@/lib/hooks/publicaciones.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCan } from '@/lib/hooks/use-can'
import { hasAnyFilter, publicacionesSearchSchema, toPublicacionFilters } from '@/lib/filters/publicaciones.filters'
import { useCategoriasOptions } from '@/lib/hooks/categorias.hooks'
import { PublicacionesTable } from '@/app/components/publicaciones/PublicacionesTable'
import { DataTablePagination, FilterBar, SearchFilter, SelectFilter } from '@/app/components/data-table'

function PublicacionesContent() {
  const qc = useQueryClient()
  const canCreate = useCan('publicaciones.create')
  const [search, setSearch, resetSearch] = useUrlState(publicacionesSearchSchema)
  const filters = useMemo(() => toPublicacionFilters(search), [search])
  const { data, isLoading, isError, isPlaceholderData } = usePublicaciones(filters)
  const { data: categoriasOptions = [] } = useCategoriasOptions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Publicaciones</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {data ? `${data.total} publicaciones registradas` : 'Gestión de publicaciones'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/publicaciones/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="h-4 w-4" />
            Nueva publicación
          </Link>
        )}
      </div>

      <FilterBar hasActive={hasAnyFilter(search)} onClear={resetSearch}>
        <SearchFilter value={search.search} onChange={value => setSearch({ search: value })} placeholder="Buscar..." />
        <SelectFilter
          value={search.categoria_id ? String(search.categoria_id) : ''}
          onChange={value => setSearch({ categoria_id: value })}
          allLabel="Cualquier categoría"
          options={categoriasOptions.map(o => ({ value: String(o.value), label: o.label }))}
        />
        <SelectFilter
          value={search.publicada ?? ''}
          onChange={value => setSearch({ publicada: value })}
          allLabel="Publicada: todos"
          options={[
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
          ]}
        />
      </FilterBar>

      <PublicacionesTable
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
          onPageHover={page => qc.prefetchQuery(publicacionQueries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function PublicacionesPage() {
  return (
    <Suspense>
      <PublicacionesContent />
    </Suspense>
  )
}

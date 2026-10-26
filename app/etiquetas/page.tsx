'use client'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useEtiquetas, etiquetaQueries } from '@/lib/hooks/etiquetas.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCan } from '@/lib/hooks/use-can'
import { hasAnyFilter, etiquetasSearchSchema, toEtiquetaFilters } from '@/lib/filters/etiquetas.filters'
import { EtiquetasTable } from '@/app/components/etiquetas/EtiquetasTable'
import { DataTablePagination, FilterBar, SearchFilter } from '@/app/components/data-table'

function EtiquetasContent() {
  const qc = useQueryClient()
  const canCreate = useCan('etiquetas.create')
  const [search, setSearch, resetSearch] = useUrlState(etiquetasSearchSchema)
  const filters = useMemo(() => toEtiquetaFilters(search), [search])
  const { data, isLoading, isError, isPlaceholderData } = useEtiquetas(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Etiquetas</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {data ? `${data.total} etiquetas registradas` : 'Gestión de etiquetas'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/etiquetas/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="h-4 w-4" />
            Nueva etiqueta
          </Link>
        )}
      </div>

      <FilterBar hasActive={hasAnyFilter(search)} onClear={resetSearch}>
        <SearchFilter value={search.search} onChange={value => setSearch({ search: value })} placeholder="Buscar..." />
      </FilterBar>

      <EtiquetasTable
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
          onPageHover={page => qc.prefetchQuery(etiquetaQueries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function EtiquetasPage() {
  return (
    <Suspense>
      <EtiquetasContent />
    </Suspense>
  )
}

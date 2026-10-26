'use client'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useCategorias, categoriaQueries } from '@/lib/hooks/categorias.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCan } from '@/lib/hooks/use-can'
import { hasAnyFilter, categoriasSearchSchema, toCategoriaFilters } from '@/lib/filters/categorias.filters'
import { CategoriasTable } from '@/app/components/categorias/CategoriasTable'
import { DataTablePagination, FilterBar, SearchFilter } from '@/app/components/data-table'

function CategoriasContent() {
  const qc = useQueryClient()
  const canCreate = useCan('categorias.create')
  const [search, setSearch, resetSearch] = useUrlState(categoriasSearchSchema)
  const filters = useMemo(() => toCategoriaFilters(search), [search])
  const { data, isLoading, isError, isPlaceholderData } = useCategorias(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Categorías</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {data ? `${data.total} categorías registradas` : 'Gestión de categorías'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/categorias/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="h-4 w-4" />
            Nueva categoría
          </Link>
        )}
      </div>

      <FilterBar hasActive={hasAnyFilter(search)} onClear={resetSearch}>
        <SearchFilter value={search.search} onChange={value => setSearch({ search: value })} placeholder="Buscar..." />
      </FilterBar>

      <CategoriasTable
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
          onPageHover={page => qc.prefetchQuery(categoriaQueries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function CategoriasPage() {
  return (
    <Suspense>
      <CategoriasContent />
    </Suspense>
  )
}

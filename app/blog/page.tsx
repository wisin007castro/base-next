'use client'
import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { FiEdit3 } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { blogQueries, useBlogCategorias, useBlogPosts } from '@/lib/hooks/blog.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCan } from '@/lib/hooks/use-can'
import { blogSearchSchema, toBlogFilters } from '@/lib/filters/blog.filters'
import { DataTablePagination, FilterBar, SearchFilter, SelectFilter } from '@/app/components/data-table'
import { PostCard } from '@/app/components/blog/PostCard'

const ordenOptions = [{ value: 'populares', label: 'Más votadas' }]

function BlogContent() {
  const qc = useQueryClient()
  const canWrite = useCan('publicaciones.create')
  const [search, setSearch, resetSearch] = useUrlState(blogSearchSchema)
  const filters = useMemo(() => toBlogFilters(search), [search])
  const { data, isLoading, isError, isPlaceholderData } = useBlogPosts(filters)
  const { data: categorias = [] } = useBlogCategorias()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Blog</h1>
          <p className="mt-0.5 text-sm text-ink-3">Publicaciones de la comunidad: vota y comenta.</p>
        </div>
        {canWrite && (
          <Link
            href="/publicaciones/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiEdit3 className="h-4 w-4" />
            Escribir
          </Link>
        )}
      </div>

      <FilterBar
        hasActive={!!(search.search || search.categoria_id || search.orden !== 'recientes')}
        onClear={resetSearch}
      >
        <SearchFilter
          value={search.search}
          onChange={value => setSearch({ search: value })}
          placeholder="Buscar publicaciones..."
        />
        <SelectFilter
          value={search.categoria_id ? String(search.categoria_id) : ''}
          onChange={value => setSearch({ categoria_id: value })}
          allLabel="Todas las categorías"
          options={categorias.map(c => ({ value: String(c.value), label: `${c.label} (${c.total})` }))}
        />
        <SelectFilter
          value={search.orden === 'populares' ? 'populares' : ''}
          onChange={value => setSearch({ orden: value || 'recientes' })}
          allLabel="Más recientes"
          label="Orden"
          options={ordenOptions}
        />
      </FilterBar>

      {isLoading && <p className="py-16 text-center text-sm text-ink-3">Cargando publicaciones…</p>}
      {isError && (
        <p className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">Error al cargar las publicaciones.</p>
      )}
      {data?.data.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-3">No hay publicaciones que coincidan.</p>
      )}

      {!!data?.data.length && (
        <div
          aria-busy={isPlaceholderData}
          className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {data.data.map(post => (
            <PostCard key={post.id} post={post} onCategoria={id => setSearch({ categoria_id: id })} />
          ))}
        </div>
      )}

      {data && (
        <DataTablePagination
          page={search.page}
          lastPage={data.last_page}
          total={data.total}
          from={data.from}
          to={data.to}
          perPage={data.per_page}
          onPageChange={page => setSearch({ page })}
          onPageHover={page => qc.prefetchQuery(blogQueries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function BlogPage() {
  return (
    <Suspense>
      <BlogContent />
    </Suspense>
  )
}

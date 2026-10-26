'use client'
import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { FiPlus, FiChevronDown, FiChevronUp, FiDownload, FiMail } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useUsers, userQueries } from '@/lib/hooks/users.hooks'
import { useRoles } from '@/lib/hooks/roles.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { hasAnyFilter, hasDateFilters, toUserFilters, usersSearchSchema } from '@/lib/filters/users.filters'
import { UsersTable } from '@/app/components/users/UsersTable'
import {
  DataTablePagination,
  DateFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
  ToggleFilter,
} from '@/app/components/data-table'

const statusOptions = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

/** Exporta con los mismos filtros activos (sin paginación) */
function exportUrl(filters: ReturnType<typeof toUserFilters>) {
  const params = new URLSearchParams()
  for (const key of ['search', 'role', 'is_active', 'created_from', 'created_to', 'login_from', 'login_to'] as const) {
    const value = filters[key]
    if (value !== undefined) params.set(key, String(value))
  }
  const qs = params.toString()
  return `/api/users/export${qs ? `?${qs}` : ''}`
}

function UsuariosContent() {
  const qc = useQueryClient()
  const [search, setSearch, resetSearch] = useUrlState(usersSearchSchema)
  // Memo: `search` solo cambia cuando cambia la URL, así la query key y los efectos son estables
  const filters = useMemo(() => toUserFilters(search), [search])
  const [showDateFilters, setShowDateFilters] = useState(() => hasDateFilters(search))

  const { data, isLoading, isError, isPlaceholderData } = useUsers(filters)
  const { data: roles } = useRoles()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Usuarios</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {data ? `${data.total} usuarios registrados` : 'Gestión de usuarios del sistema'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl(filters)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-surface px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-[var(--line-1)]"
            title="Exportar usuarios a CSV"
          >
            <FiDownload className="h-4 w-4" />
            Exportar CSV
          </a>
          <Link
            href="/usuarios/invitaciones"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-surface px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-[var(--line-1)]"
          >
            <FiMail className="h-4 w-4" />
            Invitar
          </Link>
          <Link
            href="/usuarios/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="h-4 w-4" />
            Nuevo usuario
          </Link>
        </div>
      </div>

      {/* Filtros (todos en la URL) */}
      <div className="space-y-3">
        <FilterBar hasActive={hasAnyFilter(search)} onClear={resetSearch}>
          <SearchFilter
            value={search.search}
            onChange={value => setSearch({ search: value })}
            placeholder="Buscar por nombre, email o username..."
          />
          <SelectFilter
            value={search.role}
            onChange={value => setSearch({ role: value })}
            allLabel="Todos los roles"
            options={(roles ?? []).map(r => ({
              value: r.name,
              label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
            }))}
          />
          <SelectFilter
            value={search.is_active ?? ''}
            onChange={value => setSearch({ is_active: value })}
            allLabel="Todos los estados"
            options={statusOptions}
          />
          <ToggleFilter
            checked={!!search.with_trashed}
            onChange={checked => setSearch({ with_trashed: checked ? 'true' : undefined })}
            label="Incluir eliminados"
          />
          <button
            type="button"
            onClick={() => setShowDateFilters(v => !v)}
            aria-expanded={showDateFilters}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              hasDateFilters(search)
                ? 'border-accent bg-[var(--accent-subtle)] text-accent'
                : 'border-[var(--line-2)] text-ink-2 hover:bg-[var(--line-1)]'
            }`}
          >
            {showDateFilters ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
            Filtros de fecha
          </button>
        </FilterBar>

        {showDateFilters && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--line-2)] bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DateFilter
              label="Registrado desde"
              value={search.created_from ?? ''}
              onChange={value => setSearch({ created_from: value })}
            />
            <DateFilter
              label="Registrado hasta"
              value={search.created_to ?? ''}
              onChange={value => setSearch({ created_to: value })}
            />
            <DateFilter
              label="Último acceso desde"
              value={search.login_from ?? ''}
              onChange={value => setSearch({ login_from: value })}
            />
            <DateFilter
              label="Último acceso hasta"
              value={search.login_to ?? ''}
              onChange={value => setSearch({ login_to: value })}
            />
          </div>
        )}
      </div>

      <UsersTable
        users={data?.data}
        isLoading={isLoading}
        isError={isError}
        isStale={isPlaceholderData}
        sort={search.sort}
        onSortChange={sort => setSearch({ sort })}
        startIndex={data?.from}
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
          onPageHover={page => qc.prefetchQuery(userQueries.list({ ...filters, page }))}
        />
      )}
    </div>
  )
}

export default function UsuariosPage() {
  return (
    <Suspense>
      <UsuariosContent />
    </Suspense>
  )
}

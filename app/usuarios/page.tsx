'use client'
import Link from 'next/link'
import { useState } from 'react'
import { FiPlus, FiSearch, FiChevronDown, FiChevronUp, FiX, FiDownload } from 'react-icons/fi'
import { useUsers } from '@/lib/hooks/users.hooks'
import { useRoles } from '@/lib/hooks/roles.hooks'
import { UsersTable } from '@/app/components/users/UsersTable'
import type { UserFilters } from '@/lib/types/user.types'

export default function UsuariosPage() {
  const [filters, setFilters] = useState<UserFilters>({ page: 1, per_page: 5 })
  const [search, setSearch] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo]     = useState('')
  const [loginFrom, setLoginFrom]     = useState('')
  const [loginTo, setLoginTo]         = useState('')

  const { data, isLoading, isError } = useUsers(filters)
  const { data: roles } = useRoles()

  function applySearch() {
    setFilters(f => ({ ...f, search, page: 1 }))
  }

  function applyDateFilter(field: keyof UserFilters, value: string) {
    setFilters(f => ({ ...f, [field]: value || undefined, page: 1 }))
  }

  function clearDateFilters() {
    setCreatedFrom('')
    setCreatedTo('')
    setLoginFrom('')
    setLoginTo('')
    setFilters(f => {
      const next = { ...f, page: 1 }
      delete next.created_from
      delete next.created_to
      delete next.login_from
      delete next.login_to
      return next
    })
  }

  const hasActiveDateFilters = !!(filters.created_from || filters.created_to || filters.login_from || filters.login_to)

  const controlClass = 'rounded-lg border border-accent/30 bg-surface-inset px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
  const dateInputClass = 'w-full rounded-lg border border-accent/30 bg-surface-inset px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

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
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (filters.search)       params.set('search', filters.search)
              if (filters.role)         params.set('role', filters.role)
              if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active))
              if (filters.created_from) params.set('created_from', filters.created_from)
              if (filters.created_to)   params.set('created_to', filters.created_to)
              if (filters.login_from)   params.set('login_from', filters.login_from)
              if (filters.login_to)     params.set('login_to', filters.login_to)
              const url = `/api/users/export${params.toString() ? `?${params.toString()}` : ''}`
              window.open(url, '_blank')
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:bg-[var(--line-1)] transition-colors"
            title="Exportar usuarios a CSV"
          >
            <FiDownload className="w-4 h-4" />
            Exportar CSV
          </button>
          <Link
            href="/usuarios/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Nuevo usuario
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-1 min-w-56 items-center gap-2 rounded-lg border border-accent/30 bg-surface-inset px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <FiSearch className="w-4 h-4 text-ink-3 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-ink-1 placeholder:text-ink-4 outline-none"
              placeholder="Buscar por nombre, email o username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
            />
          </div>
          <select
            className={controlClass}
            onChange={e => setFilters(f => ({ ...f, role: e.target.value || undefined, page: 1 }))}
          >
            <option value="">Todos los roles</option>
            {roles?.map(role => (
              <option key={role.id} value={role.name}>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</option>
            ))}
          </select>
          <select
            className={controlClass}
            onChange={e => {
              const v = e.target.value
              setFilters(f => ({ ...f, is_active: v === '' ? undefined : v === 'true', page: 1 }))
            }}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded"
              onChange={e => setFilters(f => ({ ...f, with_trashed: e.target.checked, page: 1 }))}
            />
            Incluir eliminados
          </label>
          <button
            onClick={() => setShowDateFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              hasActiveDateFilters
                ? 'border-accent bg-[var(--accent-subtle)] text-accent'
                : 'border-[var(--line-2)] text-ink-2 hover:bg-[var(--line-1)]'
            }`}
          >
            {showDateFilters ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
            Filtros avanzados
            {hasActiveDateFilters && (
              <span className="ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-fg)]">
                activos
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros de fecha */}
        {showDateFilters && (
          <div className="rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Filtros de fecha</p>
              {hasActiveDateFilters && (
                <button
                  onClick={clearDateFilters}
                  className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-risk transition-colors"
                >
                  <FiX className="w-3 h-3" />
                  Limpiar fechas
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Registrado desde</label>
                <input
                  type="date"
                  className={dateInputClass}
                  value={createdFrom}
                  onChange={e => {
                    setCreatedFrom(e.target.value)
                    applyDateFilter('created_from', e.target.value)
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Registrado hasta</label>
                <input
                  type="date"
                  className={dateInputClass}
                  value={createdTo}
                  onChange={e => {
                    setCreatedTo(e.target.value)
                    applyDateFilter('created_to', e.target.value)
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Último acceso desde</label>
                <input
                  type="date"
                  className={dateInputClass}
                  value={loginFrom}
                  onChange={e => {
                    setLoginFrom(e.target.value)
                    applyDateFilter('login_from', e.target.value)
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Último acceso hasta</label>
                <input
                  type="date"
                  className={dateInputClass}
                  value={loginTo}
                  onChange={e => {
                    setLoginTo(e.target.value)
                    applyDateFilter('login_to', e.target.value)
                  }}
                />
              </div>
            </div>
            {!hasActiveDateFilters && (
              <p className="text-xs text-ink-4">Selecciona una o más fechas para filtrar el listado.</p>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      {isLoading && (
        <div className="py-16 text-center text-sm text-ink-3">Cargando usuarios...</div>
      )}
      {isError && (
        <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
          Error al cargar los usuarios. Verifica la conexión con la API.
        </div>
      )}
      {data && <UsersTable users={data.data} withTrashed={filters.with_trashed} startIndex={data.from} />}

      {/* Paginación */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-3">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={filters.per_page ?? 5}
              onChange={e => setFilters(f => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
              className={controlClass}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={50}>50</option>
            </select>
            <span>por página · {data.total} en total</span>
          </div>

          {data.last_page > 1 && (
            <div className="flex items-center gap-2">
              <span>Mostrando {data.from}–{data.to}</span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={(filters.page ?? 1) <= 1}
                className="rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-ink-2 hover:bg-[var(--line-1)] disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <span className="rounded-lg border border-accent bg-[var(--accent-subtle)] px-3 py-1.5 text-accent">
                {filters.page ?? 1} / {data.last_page}
              </span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(filters.page ?? 1) >= data.last_page}
                className="rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-ink-2 hover:bg-[var(--line-1)] disabled:opacity-40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

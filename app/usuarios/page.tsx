'use client'
import Link from 'next/link'
import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { useUsers } from '@/lib/hooks/users.hooks'
import { useRoles } from '@/lib/hooks/roles.hooks'
import { UsersTable } from '@/app/components/users/UsersTable'
import type { UserFilters } from '@/lib/types/user.types'

export default function UsuariosPage() {
  const [filters, setFilters] = useState<UserFilters>({ page: 1, per_page: 5 })
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useUsers(filters)
  const { data: roles } = useRoles()

  function applySearch() {
    setFilters(f => ({ ...f, search, page: 1 }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Usuarios</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {data ? `${data.total} usuarios registrados` : 'Gestión de usuarios del sistema'}
          </p>
        </div>
        <Link
          href="/usuarios/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Nuevo usuario
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-1 min-w-56 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
          <FiSearch className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
            placeholder="Buscar por nombre, email o username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          onChange={e => setFilters(f => ({ ...f, role: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Todos los roles</option>
          {roles?.map(role => (
            <option key={role.id} value={role.name}>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          onChange={e => {
            const v = e.target.value
            setFilters(f => ({ ...f, is_active: v === '' ? undefined : v === 'true', page: 1 }))
          }}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded"
            onChange={e => setFilters(f => ({ ...f, with_trashed: e.target.checked, page: 1 }))}
          />
          Incluir eliminados
        </label>
      </div>

      {/* Tabla */}
      {isLoading && (
        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando usuarios...</div>
      )}
      {isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Error al cargar los usuarios. Verifica la conexión con la API.
        </div>
      )}
      {data && <UsersTable users={data.data} withTrashed={filters.with_trashed} startIndex={data.from} />}

      {/* Paginación */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={filters.per_page ?? 5}
              onChange={e => setFilters(f => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <span className="rounded-lg border border-sky-500 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-sky-600">
                {filters.page ?? 1} / {data.last_page}
              </span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(filters.page ?? 1) >= data.last_page}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
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

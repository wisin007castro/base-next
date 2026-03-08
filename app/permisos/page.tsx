'use client'
import Link from 'next/link'
import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermissions, useDeletePermission } from '@/lib/hooks/permissions.hooks'
import { PermissionsTable } from '@/app/components/permissions/PermissionsTable'
import type { Permission } from '@/lib/types/rbac.types'

export default function PermisosPage() {
  const { data: permissions, isLoading, isError } = usePermissions()
  const deletePermission = useDeletePermission()
  const [confirm, setConfirm] = useState<Permission | null>(null)
  const [search, setSearch] = useState('')

  const filtered = (permissions ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(permission: Permission) {
    setConfirm(permission)
  }

  function confirmDelete() {
    if (!confirm) return
    deletePermission.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Permisos</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {permissions ? `${permissions.length} permisos registrados` : 'Gestión de permisos del sistema'}
          </p>
        </div>
        <Link
          href="/permisos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Nuevo permiso
        </Link>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 max-w-sm">
        <FiSearch className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
          placeholder="Buscar permisos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando permisos...</div>
      )}
      {isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Error al cargar los permisos.
        </div>
      )}
      {permissions && <PermissionsTable permissions={filtered} onDelete={handleDelete} />}

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Eliminar permiso</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ¿Estás seguro de eliminar el permiso <strong className="text-gray-900 dark:text-gray-100">{confirm.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletePermission.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deletePermission.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

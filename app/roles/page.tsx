'use client'
import Link from 'next/link'
import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useRoles, useDeleteRole } from '@/lib/hooks/roles.hooks'
import { RolesTable } from '@/app/components/roles/RolesTable'
import type { Role } from '@/lib/types/rbac.types'

export default function RolesPage() {
  const { data: roles, isLoading, isError } = useRoles()
  const deleteRole = useDeleteRole()
  const [confirm, setConfirm] = useState<Role | null>(null)

  function handleDelete(role: Role) {
    setConfirm(role)
  }

  function confirmDelete() {
    if (!confirm) return
    deleteRole.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Roles</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {roles ? `${roles.length} roles registrados` : 'Gestión de roles del sistema'}
          </p>
        </div>
        <Link
          href="/roles/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Nuevo rol
        </Link>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando roles...</div>
      )}
      {isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Error al cargar los roles.
        </div>
      )}
      {roles && <RolesTable roles={roles} onDelete={handleDelete} />}

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Eliminar rol</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ¿Estás seguro de eliminar el rol <strong className="text-gray-900 dark:text-gray-100 capitalize">{confirm.name}</strong>? Esta acción no se puede deshacer.
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
                disabled={deleteRole.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteRole.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

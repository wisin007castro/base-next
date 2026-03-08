'use client'
import Link from 'next/link'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Role } from '@/lib/types/rbac.types'

interface Props {
  roles: Role[]
  onDelete: (role: Role) => void
}

export function RolesTable({ roles, onDelete }: Props) {
  if (roles.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        No hay roles registrados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Nombre</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Descripción</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Guard</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Permisos</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {roles.map(role => (
            <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{role.id}</td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 capitalize">{role.name}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {role.description ?? <span className="italic text-gray-300 dark:text-gray-600">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                  {role.guard_name}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.slice(0, 3).map(p => (
                      <span key={p.id} className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300">
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sin permisos</span>
                  )}
                  {role.permissions && role.permissions.length > 3 && (
                    <span className="text-xs text-gray-400">+{role.permissions.length - 3}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/roles/${role.id}/editar`}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-sky-600 transition"
                    title="Editar"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onDelete(role)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
                    title="Eliminar"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

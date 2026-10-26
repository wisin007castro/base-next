'use client'
import Link from 'next/link'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Role } from '@/lib/types/rbac.types'
import { usePrefetchRole } from '@/lib/hooks/roles.hooks'
import { DataTable, createColumnHelper } from '@/app/components/data-table'

interface Props {
  roles: Role[] | undefined
  isLoading?: boolean
  isError?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  /** Búsqueda sobre nombre y descripción (en el cliente) */
  globalFilter?: string
  onDelete: (role: Role) => void
}

const iconBtn = 'rounded p-1.5 transition-colors'
const MAX_PERMS = 3
const col = createColumnHelper<Role>()

export function RolesTable({ roles, onDelete, ...tableProps }: Props) {
  const prefetchRole = usePrefetchRole()

  const columns = [
    col.accessor('id', { header: '#', enableGlobalFilter: false, meta: { className: 'text-ink-3' } }),
    col.accessor('name', { header: 'Nombre', meta: { className: 'font-medium capitalize text-ink-1' } }),
    col.accessor('description', {
      header: 'Descripción',
      enableSorting: false,
      meta: { className: 'text-ink-3' },
      cell: ({ getValue }) => getValue() || <span className="italic text-ink-4">—</span>,
    }),
    col.display({
      id: 'guard',
      header: 'Guard',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-[var(--line-2)] px-2.5 py-0.5 text-xs text-ink-3">
          {row.original.guard_name}
        </span>
      ),
    }),
    // Se ordena por cantidad de permisos; se muestran los primeros como badges
    col.accessor(r => r.permissions?.length ?? 0, {
      id: 'permissions',
      header: 'Permisos',
      enableGlobalFilter: false,
      cell: ({ row: { original: r } }) =>
        r.permissions?.length ? (
          <div className="flex flex-wrap gap-1">
            {r.permissions.slice(0, MAX_PERMS).map(p => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-xs text-accent"
              >
                {p.name}
              </span>
            ))}
            {r.permissions.length > MAX_PERMS && (
              <span className="text-xs text-ink-4">+{r.permissions.length - MAX_PERMS}</span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-ink-4">Sin permisos</span>
        ),
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/roles/${r.id}/editar`}
            onMouseEnter={() => prefetchRole(r.id)}
            onFocus={() => prefetchRole(r.id)}
            title="Editar"
            className={`${iconBtn} text-accent hover:bg-[var(--accent-subtle)]`}
          >
            <FiEdit2 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onDelete(r)}
            title="Eliminar"
            className={`${iconBtn} text-risk hover:bg-[var(--risk-bg)]`}
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ]

  return (
    <DataTable
      mode="client"
      columns={columns}
      data={roles}
      getRowId={r => String(r.id)}
      errorMessage="Error al cargar los roles."
      emptyMessage="No hay roles que coincidan."
      {...tableProps}
    />
  )
}

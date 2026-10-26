'use client'
import Link from 'next/link'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Permission } from '@/lib/types/rbac.types'
import { usePrefetchPermission } from '@/lib/hooks/permissions.hooks'
import { DataTable, createColumnHelper } from '@/app/components/data-table'

interface Props {
  permissions: Permission[] | undefined
  isLoading?: boolean
  isError?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  /** Búsqueda sobre nombre y descripción (en el cliente) */
  globalFilter?: string
  onDelete: (permission: Permission) => void
}

const iconBtn = 'rounded p-1.5 transition-colors'
const col = createColumnHelper<Permission>()

export function PermissionsTable({ permissions, onDelete, ...tableProps }: Props) {
  const prefetchPermission = usePrefetchPermission()

  const columns = [
    col.accessor('id', { header: '#', enableGlobalFilter: false, meta: { className: 'text-ink-3' } }),
    col.accessor('name', { header: 'Nombre', meta: { className: 'font-medium text-ink-1' } }),
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
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: p } }) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/permisos/${p.id}/editar`}
            onMouseEnter={() => prefetchPermission(p.id)}
            onFocus={() => prefetchPermission(p.id)}
            title="Editar"
            className={`${iconBtn} text-accent hover:bg-[var(--accent-subtle)]`}
          >
            <FiEdit2 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onDelete(p)}
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
      data={permissions}
      getRowId={p => String(p.id)}
      errorMessage="Error al cargar los permisos."
      emptyMessage="No hay permisos que coincidan."
      {...tableProps}
    />
  )
}

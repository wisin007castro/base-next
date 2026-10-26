'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Publicacion } from '@/lib/types/publicacion.types'
import {
  BulkActionButton,
  BulkActionsBar,
  ConfirmDialog,
  DataTable,
  YesNoBadge,
  createColumnHelper,
  formatDate,
  selectionColumn,
  type RowSelectionState,
} from '@/app/components/data-table'
import {
  useBulkDeletePublicaciones,
  useDeletePublicacion,
  usePrefetchPublicacion,
} from '@/lib/hooks/publicaciones.hooks'
import { useCan } from '@/lib/hooks/use-can'

interface Props {
  items: Publicacion[] | undefined
  isLoading?: boolean
  isError?: boolean
  isStale?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  /** Al cambiar (filtros, página…) se limpia la selección */
  selectionResetKey?: string
}

const iconBtn = 'rounded p-1.5 transition-colors'
const col = createColumnHelper<Publicacion>()

export function PublicacionesTable({ items, selectionResetKey, ...tableProps }: Props) {
  const canEdit = useCan('publicaciones.edit')
  const canDelete = useCan('publicaciones.delete')
  const remove = useDeletePublicacion()
  const bulkDelete = useBulkDeletePublicaciones()
  const prefetch = usePrefetchPublicacion()

  const [toDelete, setToDelete] = useState<Publicacion | null>(null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Limpiar la selección cuando cambian filtros/página (sin efecto)
  const [prevResetKey, setPrevResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevResetKey) {
    setPrevResetKey(selectionResetKey)
    setRowSelection({})
  }

  const selected = (items ?? []).filter(i => rowSelection[String(i.id)])

  const editLinkProps = (item: Publicacion) => ({
    href: `/publicaciones/${item.id}/editar`,
    onMouseEnter: () => prefetch(item.id),
    onFocus: () => prefetch(item.id),
  })

  const columns = [
    ...(canDelete ? [selectionColumn<Publicacion>()] : []),
    col.accessor('id', { header: '#', meta: { className: 'text-ink-3' } }),
    col.accessor('titulo', {
      header: 'Título',
      cell: ({ row: { original: item } }) => (
        <Link {...editLinkProps(item)} className="font-medium text-ink-1 transition-colors hover:text-accent">
          {item.titulo}
        </Link>
      ),
    }),
    col.accessor('resumen', {
      header: 'Resumen',
      cell: ({ getValue }) => getValue() || <span className="italic text-ink-4">—</span>,
    }),
    col.accessor('contenido', {
      header: 'Contenido',
      enableSorting: false,
      meta: { className: 'max-w-xs truncate text-ink-3' },
      cell: ({ getValue }) => getValue() || <span className="italic text-ink-4">—</span>,
    }),
    col.accessor(r => r.categoria?.label ?? null, {
      header: 'Categoría',
      enableGlobalFilter: false,
      id: 'categoria_id',
      cell: ({ getValue }) => getValue() ?? <span className="italic text-ink-4">—</span>,
    }),
    col.accessor('publicada', {
      header: 'Publicada',
      enableGlobalFilter: false,
      cell: ({ getValue }) => <YesNoBadge value={getValue()} />,
    }),
    col.accessor('fecha_publicacion', {
      header: 'Fecha de publicación',
      enableGlobalFilter: false,
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    col.accessor(r => r.autor?.label ?? null, {
      header: 'Autor',
      enableGlobalFilter: false,
      id: 'autor_id',
      cell: ({ getValue }) => getValue() ?? <span className="italic text-ink-4">—</span>,
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: item } }) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <Link
              href={`/publicaciones/${item.id}/editar`}
              onMouseEnter={() => prefetch(item.id)}
              onFocus={() => prefetch(item.id)}
              title="Editar"
              className={`${iconBtn} text-accent hover:bg-[var(--accent-subtle)]`}
            >
              <FiEdit2 className="h-4 w-4" />
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setToDelete(item)}
              title="Eliminar"
              className={`${iconBtn} text-risk hover:bg-[var(--risk-bg)]`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    }),
  ]

  return (
    <div className="space-y-3">
      <BulkActionsBar count={selected.length} onClear={() => setRowSelection({})}>
        <BulkActionButton onClick={() => setConfirmBulk(true)} tone="danger" icon={<FiTrash2 className="h-4 w-4" />}>
          Eliminar
        </BulkActionButton>
      </BulkActionsBar>

      <DataTable
        mode="server"
        columns={columns}
        data={items}
        getRowId={i => String(i.id)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableRowSelection={canDelete}
        errorMessage="Error al cargar las publicaciones."
        emptyMessage="No se encontraron publicaciones."
        {...tableProps}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar publicación"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar la publicación <strong className="text-ink-1">{toDelete && toDelete.titulo}</strong>? Esta acción no
        se puede deshacer.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmBulk}
        title="Eliminar publicaciones"
        isPending={bulkDelete.isPending}
        error={bulkDelete.error?.message}
        onCancel={() => {
          setConfirmBulk(false)
          bulkDelete.reset()
        }}
        onConfirm={() =>
          bulkDelete.mutate(
            selected.map(i => i.id),
            {
              onSuccess: () => {
                setConfirmBulk(false)
                setRowSelection({})
              },
            },
          )
        }
      >
        Se eliminarán <strong className="text-ink-1">{selected.length}</strong> registro(s). Esta acción no se puede
        deshacer.
      </ConfirmDialog>
    </div>
  )
}

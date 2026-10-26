'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Etiqueta } from '@/lib/types/etiqueta.types'
import type { BulkEtiquetaAction } from '@/lib/api/schemas/etiqueta.schema'
import {
  BulkActionButton,
  BulkActionsBar,
  ConfirmDialog,
  DataTable,
  createColumnHelper,
  selectionColumn,
  type RowSelectionState,
} from '@/app/components/data-table'
import { useBulkEtiquetas, useDeleteEtiqueta, usePrefetchEtiqueta } from '@/lib/hooks/etiquetas.hooks'
import { useCan } from '@/lib/hooks/use-can'

interface Props {
  items: Etiqueta[] | undefined
  isLoading?: boolean
  isError?: boolean
  isStale?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  /** Al cambiar (filtros, página…) se limpia la selección */
  selectionResetKey?: string
}

const iconBtn = 'rounded p-1.5 transition-colors disabled:opacity-50'
const col = createColumnHelper<Etiqueta>()

const BULK_TEXT: Record<BulkEtiquetaAction, { title: string; label: string; body: string }> = {
  delete: { title: 'Eliminar etiquetas', label: 'Eliminar', body: 'Esta acción no se puede deshacer.' },
}

export function EtiquetasTable({ items, selectionResetKey, ...tableProps }: Props) {
  const canEdit = useCan('etiquetas.edit')
  const canDelete = useCan('etiquetas.delete')
  const remove = useDeleteEtiqueta()
  const bulk = useBulkEtiquetas()
  const prefetch = usePrefetchEtiqueta()

  const [toDelete, setToDelete] = useState<Etiqueta | null>(null)
  const [pendingBulk, setPendingBulk] = useState<BulkEtiquetaAction | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Limpiar la selección cuando cambian filtros/página (sin efecto)
  const [prevResetKey, setPrevResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevResetKey) {
    setPrevResetKey(selectionResetKey)
    setRowSelection({})
  }

  const selected = (items ?? []).filter(i => rowSelection[String(i.id)])

  const editLinkProps = (item: Etiqueta) => ({
    href: `/etiquetas/${item.id}/editar`,
    onMouseEnter: () => prefetch(item.id),
    onFocus: () => prefetch(item.id),
  })

  const columns = [
    ...(canDelete ? [selectionColumn<Etiqueta>()] : []),
    col.accessor('id', { header: '#', meta: { className: 'text-ink-3' } }),
    col.accessor('nombre', {
      header: 'Nombre',
      cell: ({ row: { original: item } }) => (
        <Link {...editLinkProps(item)} className="font-medium text-ink-1 transition-colors hover:text-accent">
          {item.nombre}
        </Link>
      ),
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: item } }) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <Link
              href={`/etiquetas/${item.id}/editar`}
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

  const bulkText = pendingBulk ? BULK_TEXT[pendingBulk] : null

  return (
    <div className="space-y-3">
      <BulkActionsBar count={selected.length} onClear={() => setRowSelection({})}>
        <BulkActionButton
          onClick={() => setPendingBulk('delete')}
          tone="danger"
          icon={<FiTrash2 className="h-4 w-4" />}
        >
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
        errorMessage="Error al cargar las etiquetas."
        emptyMessage="No se encontraron etiquetas."
        {...tableProps}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar etiqueta"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar la etiqueta <strong className="text-ink-1">{toDelete && toDelete.nombre}</strong>? Esta acción no se
        puede deshacer.
      </ConfirmDialog>

      <ConfirmDialog
        open={!!bulkText}
        title={bulkText?.title ?? ''}
        confirmLabel={bulkText?.label}
        isPending={bulk.isPending}
        error={bulk.error?.message}
        onCancel={() => {
          setPendingBulk(null)
          bulk.reset()
        }}
        onConfirm={() =>
          pendingBulk &&
          bulk.mutate(
            { action: pendingBulk, ids: selected.map(i => i.id) },
            {
              onSuccess: () => {
                setPendingBulk(null)
                setRowSelection({})
              },
            },
          )
        }
      >
        Se aplicará a <strong className="text-ink-1">{selected.length}</strong> registro(s). {bulkText?.body}
      </ConfirmDialog>
    </div>
  )
}

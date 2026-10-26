'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FiEdit2, FiRotateCcw, FiTrash2, FiXCircle } from 'react-icons/fi'
import type { Publicacion } from '@/lib/types/publicacion.types'
import type { BulkPublicacionAction } from '@/lib/api/schemas/publicacion.schema'
import {
  BulkActionButton,
  BulkActionsBar,
  ConfirmDialog,
  DataTable,
  DeletedBadge,
  RefBadges,
  YesNoBadge,
  createColumnHelper,
  formatDate,
  selectionColumn,
  type RowSelectionState,
} from '@/app/components/data-table'
import {
  useBulkPublicaciones,
  useDeletePublicacion,
  useForceDeletePublicacion,
  usePrefetchPublicacion,
  useRestorePublicacion,
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

const iconBtn = 'rounded p-1.5 transition-colors disabled:opacity-50'
const col = createColumnHelper<Publicacion>()

const BULK_TEXT: Record<BulkPublicacionAction, { title: string; label: string; body: string }> = {
  delete: {
    title: 'Eliminar publicaciones',
    label: 'Eliminar',
    body: 'Podrás restaurarlos desde "Incluir eliminados".',
  },
  restore: { title: 'Restaurar publicaciones', label: 'Restaurar', body: 'Volverán a estar activos.' },
  force_delete: {
    title: 'Eliminar definitivamente',
    label: 'Eliminar definitivamente',
    body: 'Solo se borran los ya eliminados. No se puede deshacer.',
  },
}

export function PublicacionesTable({ items, selectionResetKey, ...tableProps }: Props) {
  const canEdit = useCan('publicaciones.edit')
  const canDelete = useCan('publicaciones.delete')
  const canForceDelete = useCan('publicaciones.force_delete')
  const remove = useDeletePublicacion()
  const restore = useRestorePublicacion()
  const forceDelete = useForceDeletePublicacion()
  const bulk = useBulkPublicaciones()
  const prefetch = usePrefetchPublicacion()

  const [toDelete, setToDelete] = useState<Publicacion | null>(null)
  const [toForceDelete, setToForceDelete] = useState<Publicacion | null>(null)
  const [pendingBulk, setPendingBulk] = useState<BulkPublicacionAction | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Limpiar la selección cuando cambian filtros/página (sin efecto)
  const [prevResetKey, setPrevResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevResetKey) {
    setPrevResetKey(selectionResetKey)
    setRowSelection({})
  }

  const selected = (items ?? []).filter(i => rowSelection[String(i.id)])
  const anyDeleted = selected.some(i => i.deleted_at)
  const anyAlive = selected.some(i => !i.deleted_at)

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
    col.accessor(r => r.etiquetas, {
      header: 'Etiquetas',
      enableSorting: false,
      enableGlobalFilter: false,
      id: 'etiqueta_ids',
      cell: ({ getValue }) => <RefBadges items={getValue()} />,
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
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => (row.original.deleted_at ? <DeletedBadge /> : null),
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: item } }) => (
        <div className="flex items-center justify-end gap-1">
          {item.deleted_at ? (
            <>
              {canDelete && (
                <button
                  onClick={() => restore.mutate(item.id)}
                  disabled={restore.isPending}
                  title="Restaurar"
                  className={`${iconBtn} text-ok hover:bg-[var(--ok-bg)]`}
                >
                  <FiRotateCcw className="h-4 w-4" />
                </button>
              )}
              {canForceDelete && (
                <button
                  onClick={() => setToForceDelete(item)}
                  title="Eliminar definitivamente"
                  className={`${iconBtn} text-risk hover:bg-[var(--risk-bg)]`}
                >
                  <FiXCircle className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ),
    }),
  ]

  const bulkText = pendingBulk ? BULK_TEXT[pendingBulk] : null

  return (
    <div className="space-y-3">
      <BulkActionsBar count={selected.length} onClear={() => setRowSelection({})}>
        {anyAlive && (
          <BulkActionButton
            onClick={() => setPendingBulk('delete')}
            tone="danger"
            icon={<FiTrash2 className="h-4 w-4" />}
          >
            Eliminar
          </BulkActionButton>
        )}
        {anyDeleted && (
          <BulkActionButton onClick={() => setPendingBulk('restore')} icon={<FiRotateCcw className="h-4 w-4" />}>
            Restaurar
          </BulkActionButton>
        )}
        {anyDeleted && canForceDelete && (
          <BulkActionButton
            onClick={() => setPendingBulk('force_delete')}
            tone="danger"
            icon={<FiXCircle className="h-4 w-4" />}
          >
            Eliminar definitivamente
          </BulkActionButton>
        )}
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
        ¿Eliminar la publicación <strong className="text-ink-1">{toDelete && toDelete.titulo}</strong>? Podrás
        restaurarla después.
      </ConfirmDialog>

      <ConfirmDialog
        open={!!toForceDelete}
        title="Eliminar definitivamente"
        confirmLabel="Eliminar definitivamente"
        isPending={forceDelete.isPending}
        error={forceDelete.error?.message}
        onCancel={() => {
          setToForceDelete(null)
          forceDelete.reset()
        }}
        onConfirm={() =>
          toForceDelete && forceDelete.mutate(toForceDelete.id, { onSuccess: () => setToForceDelete(null) })
        }
      >
        ¿Borrar para siempre <strong className="text-ink-1">{toForceDelete && toForceDelete.titulo}</strong>? No se
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

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
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
} from '.'

interface Post {
  id: number
  titulo: string
  etiquetas: { id: number; label: string }[]
  publicada: boolean
  fecha: string
  eliminada: boolean
}

const rows: Post[] = [
  {
    id: 1,
    titulo: 'Novedades de octubre',
    etiquetas: [{ id: 1, label: 'Noticias' }],
    publicada: true,
    fecha: '2026-10-01',
    eliminada: false,
  },
  {
    id: 2,
    titulo: 'Cómo usar el generador',
    etiquetas: [
      { id: 2, label: 'Tutoriales' },
      { id: 3, label: 'Producto' },
      { id: 4, label: 'Avanzado' },
      { id: 5, label: 'Guía' },
    ],
    publicada: false,
    fecha: '2026-09-15',
    eliminada: false,
  },
  { id: 3, titulo: 'Borrador antiguo', etiquetas: [], publicada: false, fecha: '2025-12-31', eliminada: true },
]

const col = createColumnHelper<Post>()
const columns = [
  selectionColumn<Post>(),
  col.accessor('id', { header: '#', meta: { className: 'text-ink-3' } }),
  col.accessor('titulo', { header: 'Título', meta: { className: 'font-medium text-ink-1' } }),
  col.display({
    id: 'etiquetas',
    header: 'Etiquetas',
    cell: ({ row }) => <RefBadges items={row.original.etiquetas} />,
  }),
  col.accessor('publicada', { header: 'Publicada', cell: ({ getValue }) => <YesNoBadge value={getValue()} /> }),
  col.accessor('fecha', { header: 'Fecha', cell: ({ getValue }) => formatDate(getValue()) }),
  col.display({
    id: 'estado',
    header: 'Estado',
    cell: ({ row }) => (row.original.eliminada ? <DeletedBadge /> : null),
  }),
]

/** Tabla en modo client (ordena en memoria) con selección y barra de acciones en lote */
function TableDemo({ data, isLoading, isError }: { data?: Post[]; isLoading?: boolean; isError?: boolean }) {
  const [sort, setSort] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [confirm, setConfirm] = useState(false)
  const count = Object.keys(rowSelection).length

  return (
    <div className="max-w-4xl space-y-3">
      <BulkActionsBar count={count} onClear={() => setRowSelection({})}>
        <BulkActionButton tone="danger" icon={<FiTrash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>
          Eliminar
        </BulkActionButton>
      </BulkActionsBar>
      <DataTable
        mode="client"
        columns={columns}
        data={data}
        getRowId={p => String(p.id)}
        sort={sort}
        onSortChange={setSort}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableRowSelection
        isLoading={isLoading}
        isError={isError}
      />
      <ConfirmDialog
        open={confirm}
        title="Eliminar publicaciones"
        onCancel={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
      >
        Se aplicará a <strong className="text-ink-1">{count}</strong> registro(s).
      </ConfirmDialog>
    </div>
  )
}

const meta: Meta<typeof TableDemo> = { title: 'Tablas/DataTable', component: TableDemo }
export default meta
type Story = StoryObj<typeof TableDemo>

export const ConDatos: Story = { args: { data: rows } }
export const Vacia: Story = { args: { data: [] } }
export const Cargando: Story = { args: { isLoading: true } }
export const ConError: Story = { args: { isError: true } }

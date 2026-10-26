'use client'
import { useEffect, useRef, type InputHTMLAttributes } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { FiArrowDown, FiArrowUp, FiChevronDown } from 'react-icons/fi'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center'
    className?: string
  }
}

interface Props<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columnas con TValue distintos
  columns: ColumnDef<T, any>[]
  data: T[] | undefined
  getRowId: (row: T) => string
  /**
   * `server`: la API ya ordena/filtra (manualSorting), la tabla solo refleja el estado.
   * `client`: TanStack Table ordena y filtra (`globalFilter`) en memoria.
   */
  mode?: 'server' | 'client'
  /** Orden en formato URL: `campo` asc, `-campo` desc. El id de la columna es el campo. */
  sort?: string
  onSortChange?: (sort: string) => void
  /** Texto de búsqueda (solo `mode="client"`): filtra sobre las columnas con accessor */
  globalFilter?: string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  enableRowSelection?: boolean | ((row: Row<T>) => boolean)
  isLoading?: boolean
  isError?: boolean
  /** true mientras se muestra la página anterior y llega la nueva (keepPreviousData) */
  isStale?: boolean
  errorMessage?: string
  emptyMessage?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

const toSorting = (sort?: string): SortingState =>
  sort ? [{ id: sort.replace(/^-/, ''), desc: sort.startsWith('-') }] : []

/** Referencia estable para `data` vacío (un `[]` nuevo por render invalida los modelos de la tabla) */
const EMPTY: never[] = []

const fromSorting = (sorting: SortingState) => (sorting[0] ? `${sorting[0].desc ? '-' : ''}${sorting[0].id}` : '')

/**
 * Tabla genérica sobre TanStack Table (headless): el estado (orden, selección)
 * lo controla el padre — normalmente la URL — y aquí solo se pinta.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  mode = 'server',
  sort,
  onSortChange,
  globalFilter,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  isLoading,
  isError,
  isStale,
  errorMessage = 'Error al cargar los datos.',
  emptyMessage = 'No se encontraron resultados.',
}: Props<T>) {
  const sorting = toSorting(sort)

  const table = useReactTable({
    data: data ?? EMPTY,
    columns,
    getRowId,
    // Sin esto, en modo client cada cambio de `columns` (se crean en cada render) recalcula el
    // modelo ordenado/filtrado, que encola un reset de pageIndex → setState → render → columnas
    // nuevas → … bucle infinito que congela la página (no usamos paginación de TanStack: va en la URL)
    autoResetAll: false,
    state: { sorting, globalFilter, rowSelection: rowSelection ?? {} },
    onSortingChange: updater => onSortChange?.(fromSorting(typeof updater === 'function' ? updater(sorting) : updater)),
    onRowSelectionChange,
    enableRowSelection,
    enableSortingRemoval: false,
    enableMultiSort: false,
    sortDescFirst: false,
    manualSorting: mode === 'server',
    manualFiltering: mode === 'server',
    getCoreRowModel: getCoreRowModel(),
    ...(mode === 'client' && { getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel() }),
  })

  if (isLoading) return <div className="py-16 text-center text-sm text-ink-3">Cargando…</div>
  if (isError) {
    return <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">{errorMessage}</div>
  }

  const rows = table.getRowModel().rows
  if (!rows.length) return <div className="py-16 text-center text-sm text-ink-3">{emptyMessage}</div>

  return (
    <div
      aria-busy={isStale}
      className={`overflow-x-auto rounded-xl border border-[var(--line-2)] bg-surface transition-opacity ${isStale ? 'opacity-60' : ''}`}
    >
      <table className="w-full text-sm">
        <thead className="border-accent/20 border-b bg-[var(--accent-subtle)] text-xs font-semibold uppercase tracking-wider text-accent">
          {table.getHeaderGroups().map(group => (
            <tr key={group.id}>
              {group.headers.map(header => {
                const { column } = header
                const meta = column.columnDef.meta
                const sorted = column.getIsSorted()
                const content = flexRender(column.columnDef.header, header.getContext())
                return (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-4 py-3 ${alignClass[meta?.align ?? 'left']}`}
                    aria-sort={sorted ? (sorted === 'desc' ? 'descending' : 'ascending') : undefined}
                  >
                    {header.isPlaceholder ? null : column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase hover:text-[var(--accent-hover)]"
                      >
                        {content}
                        {sorted === 'asc' ? (
                          <FiArrowUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <FiArrowDown className="h-3 w-3" />
                        ) : (
                          <FiChevronDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--line-1)]">
          {rows.map(row => (
            <tr
              key={row.id}
              aria-selected={row.getIsSelected() || undefined}
              className={`hover:bg-accent/[0.07] transition-colors ${row.getIsSelected() ? 'bg-accent/[0.05]' : ''}`}
            >
              {row.getVisibleCells().map(cell => {
                const meta = cell.column.columnDef.meta
                return (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 ${alignClass[meta?.align ?? 'left']} ${meta?.className ?? ''}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Selección de filas ───────────────────────────────────────────────────────

function Checkbox({ indeterminate, ...props }: InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !props.checked
  }, [indeterminate, props.checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      className="focus:ring-[var(--accent)]/30 rounded border-[var(--line-3)] text-accent disabled:opacity-30"
      {...props}
    />
  )
}

/** Columna de checkboxes (cabecera = seleccionar la página visible) */
export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    enableSorting: false,
    enableGlobalFilter: false,
    meta: { className: 'w-10' },
    header: ({ table }) => (
      <Checkbox
        aria-label="Seleccionar todos"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Seleccionar fila"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  }
}

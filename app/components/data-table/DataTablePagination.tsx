'use client'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { PER_PAGE_OPTIONS } from '@/lib/constants/pagination'

interface Props {
  page: number
  lastPage: number
  total: number
  from: number
  to: number
  perPage: number
  perPageOptions?: number[]
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  /** Se llama al pasar el mouse por Anterior/Siguiente: ideal para prefetch */
  onPageHover?: (page: number) => void
}

const btnClass =
  'inline-flex items-center gap-1 rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-ink-2 transition-colors hover:bg-[var(--line-1)] disabled:opacity-40 disabled:hover:bg-transparent'

/** Paginación de servidor: tamaño de página, rango mostrado y Anterior/Siguiente */
export function DataTablePagination({
  page,
  lastPage,
  total,
  from,
  to,
  perPage,
  perPageOptions = PER_PAGE_OPTIONS,
  onPageChange,
  onPerPageChange,
  onPageHover,
}: Props) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-3">
      <div className="flex items-center gap-2">
        {onPerPageChange && (
          <>
            <span>Mostrar</span>
            <select
              value={perPage}
              onChange={e => onPerPageChange(Number(e.target.value))}
              className="field-input w-auto py-1.5"
              aria-label="Resultados por página"
            >
              {perPageOptions.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>por página ·</span>
          </>
        )}
        <span>{total} en total</span>
      </div>

      {lastPage > 1 && (
        <nav className="flex items-center gap-2" aria-label="Paginación">
          <span>
            Mostrando {from}–{to}
          </span>
          <button
            type="button"
            className={btnClass}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            onMouseEnter={() => page > 1 && onPageHover?.(page - 1)}
          >
            <FiChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="rounded-lg border border-accent bg-[var(--accent-subtle)] px-3 py-1.5 text-accent">
            {page} / {lastPage}
          </span>
          <button
            type="button"
            className={btnClass}
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
            onMouseEnter={() => page < lastPage && onPageHover?.(page + 1)}
          >
            Siguiente
            <FiChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  )
}

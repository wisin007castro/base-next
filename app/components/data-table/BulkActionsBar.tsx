'use client'
import type { ReactNode } from 'react'
import { FiX } from 'react-icons/fi'

/** Barra que aparece al seleccionar filas: contador + acciones en lote + "Quitar selección" */
export function BulkActionsBar({
  count,
  onClear,
  children,
}: {
  count: number
  onClear: () => void
  children: ReactNode
}) {
  if (count === 0) return null

  return (
    <div
      role="toolbar"
      aria-label="Acciones en lote"
      className="border-accent/30 flex flex-wrap items-center gap-3 rounded-xl border bg-[var(--accent-subtle)] px-4 py-2.5"
    >
      <span className="text-sm font-medium text-accent">
        {count} {count === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink-1"
      >
        <FiX className="h-4 w-4" />
        Quitar selección
      </button>
    </div>
  )
}

const tones = {
  default: 'border-[var(--line-2)] bg-surface text-ink-2 hover:bg-[var(--line-1)]',
  danger: 'border-red-300 bg-surface text-risk hover:bg-[var(--risk-bg)]',
}

export function BulkActionButton({
  onClick,
  disabled,
  tone = 'default',
  icon,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  tone?: keyof typeof tones
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {icon}
      {children}
    </button>
  )
}

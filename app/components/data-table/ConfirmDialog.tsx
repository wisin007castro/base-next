'use client'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  isPending?: boolean
  /** Mensaje de error de la acción (p. ej. `mutation.error?.message`) */
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Diálogo de confirmación para acciones destructivas (usa <dialog> nativo: foco y Esc incluidos) */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Eliminar',
  pendingLabel = 'Eliminando...',
  isPending,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={e => {
        e.preventDefault()
        if (!isPending) onCancel()
      }}
      className="w-full max-w-sm rounded-xl border border-[var(--line-2)] bg-surface p-6 text-ink-1 shadow-xl backdrop:bg-black/40"
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-ink-3">{children}</div>
      {error && <p className="mt-3 rounded-lg bg-[var(--risk-bg)] px-3 py-2 text-sm text-risk">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-[var(--line-1)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

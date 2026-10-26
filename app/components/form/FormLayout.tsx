'use client'
import type { ReactNode } from 'react'
import { useFormState } from 'react-hook-form'

/** Tarjeta con título para agrupar campos */
export function FormSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--line-2)] bg-surface p-4">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--line-2)] pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</p>
        {aside}
      </div>
      {children}
    </div>
  )
}

/** Error general del servidor (`errors.root.server`) y mensaje de éxito opcional */
export function FormStatus({ success }: { success?: string }) {
  const { errors, isSubmitSuccessful } = useFormState()
  const serverError = errors.root?.server?.message

  if (serverError) {
    return <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">{serverError}</div>
  }
  if (success && isSubmitSuccessful) {
    return <div className="rounded-lg bg-[var(--ok-bg)] px-4 py-3 text-sm text-ok">{success}</div>
  }
  return null
}

/** Botón submit que se desactiva mientras se envía */
export function SubmitButton({
  children,
  pendingText = 'Guardando...',
}: {
  children: ReactNode
  pendingText?: string
}) {
  const { isSubmitting } = useFormState()
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
    >
      {isSubmitting ? pendingText : children}
    </button>
  )
}

/** Fila de acciones: Cancelar (vuelve atrás) + submit */
export function FormActions({ submitLabel, cancel = true }: { submitLabel: ReactNode; cancel?: boolean }) {
  return (
    <div className="flex justify-end gap-3">
      {cancel && (
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-[var(--line-1)]"
        >
          Cancelar
        </button>
      )}
      <SubmitButton>{submitLabel}</SubmitButton>
    </div>
  )
}

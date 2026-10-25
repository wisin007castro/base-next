import type { ReactNode } from 'react'

export const fieldClass = (error?: string) => (error ? 'field-input field-error' : 'field-input')

interface Props {
  id: string
  label?: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

/** Label + control + ayuda + error. Base visual de todos los Field* */
export function FormField({ id, label, required, hint, error, className, children }: Props) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && ' *'}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-4">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-risk">
          {error}
        </p>
      )}
    </div>
  )
}

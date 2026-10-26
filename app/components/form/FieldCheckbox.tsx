'use client'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  hint?: string
  className?: string
}

/** Casilla para un booleano */
export function FieldCheckbox<T extends FieldValues>({ control, name, label, hint, className }: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <div className={className}>
      <label htmlFor={name} className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-2">
        <input
          id={name}
          ref={field.ref}
          name={field.name}
          onBlur={field.onBlur}
          type="checkbox"
          checked={!!field.value}
          onChange={e => field.onChange(e.target.checked)}
          className="focus:ring-[var(--accent)]/30 rounded border-[var(--line-3)] text-accent"
        />
        {label}
      </label>
      {hint && !error && <p className="mt-1 text-xs text-ink-4">{hint}</p>}
      {error && <p className="mt-1 text-xs text-risk">{error}</p>}
    </div>
  )
}

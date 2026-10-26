'use client'
import { useController, type Control, type FieldValues, type Path, type PathValue } from 'react-hook-form'
import { FormField, fieldClass, useFieldId } from './FormField'

export interface SelectOption<V> {
  value: V
  label: string
}

interface Props<T extends FieldValues, N extends Path<T>> {
  control: Control<T>
  name: N
  options: readonly SelectOption<PathValue<T, N>>[]
  label?: string
  hint?: string
  required?: boolean
  className?: string
}

/**
 * <select> nativo. Los valores pueden ser de cualquier tipo (string, number, boolean):
 * internamente se usa el índice de la opción.
 */
export function FieldSelect<T extends FieldValues, N extends Path<T>>({
  control,
  name,
  options,
  label,
  hint,
  required,
  className,
}: Props<T, N>) {
  const { field, fieldState } = useController({ control, name })
  const id = useFieldId(name)
  const error = fieldState.error?.message
  const selected = options.findIndex(o => o.value === field.value)

  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <select
        id={id}
        ref={field.ref}
        name={field.name}
        onBlur={field.onBlur}
        value={selected === -1 ? '' : String(selected)}
        onChange={e => field.onChange(options[Number(e.target.value)]?.value)}
        aria-invalid={!!error}
        className={fieldClass(error)}
      >
        {selected === -1 && <option value="">Selecciona…</option>}
        {options.map((o, i) => (
          <option key={i} value={i}>
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

'use client'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { FormField, fieldClass, useFieldId } from './FormField'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  placeholder?: string
  hint?: string
  required?: boolean
  rows?: number
  className?: string
}

/** Texto largo */
export function FieldTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  hint,
  required,
  rows = 4,
  className,
}: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  const id = useFieldId(name)
  const error = fieldState.error?.message

  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        {...field}
        value={field.value ?? ''}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass(error)}
      />
    </FormField>
  )
}

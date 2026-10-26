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
  /** `1` para enteros, `0.01` para decimales */
  step?: number
  min?: number
  max?: number
  className?: string
}

/** Input numérico: guarda `number`, o `null` si está vacío (así Zod valida el tipo real) */
export function FieldNumber<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  hint,
  required,
  step = 1,
  min,
  max,
  className,
}: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  const id = useFieldId(name)
  const error = fieldState.error?.message

  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <input
        id={id}
        ref={field.ref}
        name={field.name}
        onBlur={field.onBlur}
        type="number"
        inputMode={step === 1 ? 'numeric' : 'decimal'}
        step={step}
        min={min}
        max={max}
        value={field.value ?? ''}
        onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass(error)}
      />
    </FormField>
  )
}

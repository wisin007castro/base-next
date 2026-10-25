'use client'
import { useState } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FormField, fieldClass } from './FormField'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  type?: 'text' | 'email' | 'password' | 'date' | 'tel' | 'url'
  placeholder?: string
  hint?: string
  required?: boolean
  autoComplete?: string
  className?: string
}

/** Input de texto. Con `type="password"` añade el botón de mostrar/ocultar. */
export function FieldText<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  placeholder,
  hint,
  required,
  autoComplete,
  className,
}: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  const [reveal, setReveal] = useState(false)
  const error = fieldState.error?.message
  const isPassword = type === 'password'

  const input = (
    <input
      id={name}
      {...field}
      value={field.value ?? ''}
      type={isPassword && reveal ? 'text' : type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined}
      className={fieldClass(error) + (isPassword ? ' pr-10' : '')}
    />
  )

  return (
    <FormField id={name} label={label} required={required} hint={hint} error={error} className={className}>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setReveal(v => !v)}
            aria-label={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-ink-2"
          >
            {reveal ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        input
      )}
    </FormField>
  )
}

'use client'
import type { ReactNode } from 'react'
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { applyServerErrors } from '@/lib/forms/server-errors'

interface Props<T extends FieldValues> {
  form: UseFormReturn<T>
  onSubmit: (values: T) => Promise<unknown> | unknown
  children: ReactNode
  className?: string
}

/**
 * <form> + FormProvider. Valida con el resolver de `form` y, si `onSubmit`
 * lanza (p. ej. un ApiError 422), pinta los errores del servidor en los campos.
 */
export function Form<T extends FieldValues>({ form, onSubmit, children, className }: Props<T>) {
  const submit = form.handleSubmit(async values => {
    try {
      await onSubmit(values)
    } catch (err) {
      applyServerErrors(form, err)
    }
  })

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submit} className={className}>
        {children}
      </form>
    </FormProvider>
  )
}

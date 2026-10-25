import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ApiError } from '@/lib/api/http'

/**
 * Traslada los errores de la API al formulario:
 * - `fieldErrors` cuyo nombre coincide con un campo → error en ese campo
 * - el resto, o el mensaje general si ningún campo coincidió → `errors.root.server`
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown) {
  const values = form.getValues()
  const general: string[] = []
  let matched = 0

  if (err instanceof ApiError) {
    for (const [field, messages] of Object.entries(err.fieldErrors)) {
      const message = messages?.[0]
      if (!message) continue
      if (field in values) {
        form.setError(field as Path<T>, { type: 'server', message })
        matched++
      } else {
        general.push(message)
      }
    }
    general.push(...err.formErrors)
  }

  if (general.length === 0 && matched === 0) {
    general.push(err instanceof Error ? err.message : 'Error inesperado. Inténtalo de nuevo.')
  }

  if (general.length > 0) form.setError('root.server', { type: 'server', message: general[0] })
}

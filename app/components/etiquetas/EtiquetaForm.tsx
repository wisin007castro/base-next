'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormActions, FormSection, FormStatus, FieldText } from '@/app/components/form'
import {
  etiquetaFormDefaults,
  etiquetaFormSchema,
  toEtiquetaDto,
  type EtiquetaFormValues,
} from '@/lib/forms/etiqueta.form'
import type { Etiqueta } from '@/lib/types/etiqueta.types'
import type { CreateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'

interface Props {
  etiqueta?: Etiqueta
  onSubmit: (data: CreateEtiquetaInput) => Promise<unknown>
}

/** Crear (sin `etiqueta`) o editar la etiqueta */
export function EtiquetaForm({ etiqueta, onSubmit }: Props) {
  const form = useForm<EtiquetaFormValues>({
    resolver: zodResolver(etiquetaFormSchema),
    defaultValues: etiquetaFormDefaults(etiqueta),
  })
  const { control } = form

  return (
    <Form form={form} onSubmit={values => onSubmit(toEtiquetaDto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos de la etiqueta">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="nombre" label="Nombre" required />
        </div>
      </FormSection>
      <FormActions submitLabel={etiqueta ? 'Guardar cambios' : 'Crear etiqueta'} />
    </Form>
  )
}

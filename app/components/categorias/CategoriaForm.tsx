'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormActions, FormSection, FormStatus, FieldText, FieldTextarea } from '@/app/components/form'
import {
  categoriaFormDefaults,
  categoriaFormSchema,
  toCategoriaDto,
  type CategoriaFormValues,
} from '@/lib/forms/categoria.form'
import type { Categoria } from '@/lib/types/categoria.types'
import type { CreateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

interface Props {
  categoria?: Categoria
  onSubmit: (data: CreateCategoriaInput) => Promise<unknown>
}

/** Crear (sin `categoria`) o editar la categoría */
export function CategoriaForm({ categoria, onSubmit }: Props) {
  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: categoriaFormDefaults(categoria),
  })
  const { control } = form

  return (
    <Form form={form} onSubmit={values => onSubmit(toCategoriaDto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos de la categoría">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="nombre" label="Nombre" required />
          <FieldTextarea control={control} name="descripcion" label="Descripción" className="sm:col-span-2" />
        </div>
      </FormSection>
      <FormActions submitLabel={categoria ? 'Guardar cambios' : 'Crear categoría'} />
    </Form>
  )
}

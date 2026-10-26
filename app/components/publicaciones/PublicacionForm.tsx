'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormActions,
  FormSection,
  FormStatus,
  FieldCheckbox,
  FieldSelect,
  FieldText,
  FieldTextarea,
} from '@/app/components/form'
import { useCategoriasOptions } from '@/lib/hooks/categorias.hooks'
import {
  publicacionFormDefaults,
  publicacionFormSchema,
  toPublicacionDto,
  type PublicacionFormValues,
} from '@/lib/forms/publicacion.form'
import type { Publicacion } from '@/lib/types/publicacion.types'
import type { CreatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

interface Props {
  publicacion?: Publicacion
  onSubmit: (data: CreatePublicacionInput) => Promise<unknown>
}

/** Crear (sin `publicacion`) o editar la publicación */
export function PublicacionForm({ publicacion, onSubmit }: Props) {
  const form = useForm<PublicacionFormValues>({
    resolver: zodResolver(publicacionFormSchema),
    defaultValues: publicacionFormDefaults(publicacion),
  })
  const { control } = form
  const { data: categoriasOptions = [] } = useCategoriasOptions()

  return (
    <Form form={form} onSubmit={values => onSubmit(toPublicacionDto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos de la publicación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="titulo" label="Título" required />
          <FieldText control={control} name="resumen" label="Resumen" />
          <FieldTextarea control={control} name="contenido" label="Contenido" required className="sm:col-span-2" />
          <FieldSelect control={control} name="categoria_id" label="Categoría" required options={categoriasOptions} />
          <FieldCheckbox control={control} name="publicada" label="Publicada" className="sm:col-span-2" />
          <FieldText control={control} name="fecha_publicacion" label="Fecha de publicación" type="date" />
        </div>
      </FormSection>
      <FormActions submitLabel={publicacion ? 'Guardar cambios' : 'Crear publicación'} />
    </Form>
  )
}

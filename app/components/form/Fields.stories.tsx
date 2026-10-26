import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from '@/lib/validation/zod-config'
import {
  FieldCheckbox,
  FieldCheckboxGroup,
  FieldNumber,
  FieldSelect,
  FieldText,
  FieldTextarea,
  Form,
  FormActions,
  FormSection,
  FormStatus,
} from '.'

const schema = z.object({
  nombre: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
  edad: z.number().int().min(18).nullable(),
  rol: z.enum(['admin', 'editor', 'lector']),
  etiquetas: z.array(z.number()),
  bio: z.string().max(200),
  activo: z.boolean(),
})
type Values = z.infer<typeof schema>

const defaults: Values = {
  nombre: '',
  email: '',
  password: '',
  edad: null,
  rol: 'lector',
  etiquetas: [],
  bio: '',
  activo: true,
}

/** Formulario con todos los Field*: el patrón de los formularios de la app (RHF + Zod) */
function FieldsDemo({ showErrors = false }: { showErrors?: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => {
    if (showErrors) void form.trigger()
  }, [form, showErrors])

  return (
    <div className="max-w-2xl">
      <Form form={form} onSubmit={async () => new Promise(r => setTimeout(r, 800))} className="space-y-4">
        <FormSection title="Datos de ejemplo">
          <FormStatus success="Guardado" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldText control={form.control} name="nombre" label="Nombre" required />
            <FieldText control={form.control} name="email" type="email" label="Correo electrónico" required />
            <FieldText control={form.control} name="password" type="password" label="Contraseña" hint="Mínimo 8" />
            <FieldNumber control={form.control} name="edad" label="Edad" min={18} />
            <FieldSelect
              control={form.control}
              name="rol"
              label="Rol"
              options={[
                { value: 'admin', label: 'Administrador' },
                { value: 'editor', label: 'Editor' },
                { value: 'lector', label: 'Lector' },
              ]}
            />
            <FieldCheckbox control={form.control} name="activo" label="Activo" />
            <FieldCheckboxGroup
              control={form.control}
              name="etiquetas"
              label="Etiquetas"
              searchable
              className="sm:col-span-2"
              options={['Noticias', 'Tutoriales', 'Eventos', 'Opinión', 'Producto'].map((label, i) => ({
                value: i + 1,
                label,
              }))}
            />
            <FieldTextarea control={form.control} name="bio" label="Biografía" className="sm:col-span-2" />
          </div>
        </FormSection>
        <FormActions submitLabel="Guardar" cancel={false} />
      </Form>
    </div>
  )
}

const meta: Meta<typeof FieldsDemo> = {
  title: 'Formularios/Campos',
  component: FieldsDemo,
}
export default meta

type Story = StoryObj<typeof FieldsDemo>

export const Vacio: Story = {}
export const ConErrores: Story = { args: { showErrors: true } }

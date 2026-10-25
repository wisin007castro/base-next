'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FieldText, FormActions, FormSection, FormStatus } from '@/app/components/form'
import {
  permissionFormDefaults,
  permissionFormSchema,
  toPermissionDto,
  type PermissionFormValues,
} from '@/lib/forms/rbac.form'
import type { Permission, CreatePermissionDto } from '@/lib/types/rbac.types'

interface Props {
  permission?: Permission
  onSubmit: (data: CreatePermissionDto) => Promise<unknown>
}

/** Crear (sin `permission`) o editar un permiso */
export function PermissionForm({ permission, onSubmit }: Props) {
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: permissionFormDefaults(permission),
  })
  const { control } = form

  return (
    <Form form={form} onSubmit={values => onSubmit(toPermissionDto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos del permiso">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText
            control={control}
            name="name"
            label="Nombre"
            required
            placeholder="users.create"
            hint="Usa formato dot-notation: recurso.acción"
          />
          <FieldText control={control} name="description" label="Descripción" placeholder="Puede crear usuarios" />
        </div>
      </FormSection>
      <FormActions submitLabel={permission ? 'Guardar cambios' : 'Crear permiso'} />
    </Form>
  )
}

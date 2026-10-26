'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FieldCheckboxGroup, FieldText, FormActions, FormSection, FormStatus } from '@/app/components/form'
import { usePermissions } from '@/lib/hooks/permissions.hooks'
import { roleFormDefaults, roleFormSchema, toRoleDto, type RoleFormValues } from '@/lib/forms/rbac.form'
import type { Role, CreateRoleDto } from '@/lib/types/rbac.types'

interface Props {
  role?: Role
  onSubmit: (data: CreateRoleDto) => Promise<unknown>
}

/** Crear (sin `role`) o editar un rol con sus permisos */
export function RoleForm({ role, onSubmit }: Props) {
  const { data: permissions, isLoading } = usePermissions()
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: roleFormDefaults(role),
  })
  const { control } = form

  return (
    <Form form={form} onSubmit={values => onSubmit(toRoleDto(values))} className="space-y-6">
      <FormStatus />
      <FormSection title="Datos del rol">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="name" label="Nombre" required placeholder="admin" />
          <FieldText control={control} name="description" label="Descripción" placeholder="Descripción del rol" />
        </div>
      </FormSection>

      <FormSection title="Permisos">
        <FieldCheckboxGroup
          control={control}
          name="permission_ids"
          searchable
          isLoading={isLoading}
          options={(permissions ?? []).map(p => ({ value: p.id, label: p.name }))}
          emptyText="No hay permisos definidos"
          optionClassName="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      </FormSection>

      <FormActions submitLabel={role ? 'Guardar cambios' : 'Crear rol'} />
    </Form>
  )
}

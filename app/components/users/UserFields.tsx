'use client'
import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { FieldCheckboxGroup, FieldSelect, FieldText, FormSection } from '@/app/components/form'
import { useRoles } from '@/lib/hooks/roles.hooks'
import {
  activeOptions,
  documentTypeOptions,
  genderOptions,
  type PersonalDataFormValues,
  type UserAccountFormValues,
} from '@/lib/forms/user.form'

/**
 * Cuenta: username, email, estado, contraseña y roles.
 * Debe usarse dentro de un <Form> cuyos valores incluyan estos campos.
 */
export function UserAccountFields({
  passwordRequired = false,
  children,
}: {
  passwordRequired?: boolean
  children?: ReactNode
}) {
  const { control } = useFormContext<UserAccountFormValues>()
  const { data: roles, isLoading } = useRoles()

  return (
    <FormSection title="Datos de cuenta">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText control={control} name="username" label="Username" required placeholder="nickname" />
        <FieldText
          control={control}
          name="email"
          type="email"
          label="Correo electrónico"
          required
          placeholder="tu@correo.com"
        />
        <FieldSelect control={control} name="is_active" label="Estado" options={activeOptions} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText
          control={control}
          name="password"
          type="password"
          label={passwordRequired ? 'Contraseña' : 'Nueva contraseña (opcional)'}
          required={passwordRequired}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <FieldText
          control={control}
          name="password_confirmation"
          type="password"
          label="Confirmar contraseña"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>
      <FieldCheckboxGroup
        control={control}
        name="role_ids"
        label="Roles"
        isLoading={isLoading}
        options={(roles ?? []).map(r => ({ value: r.id, label: r.name }))}
        emptyText="No hay roles definidos"
      />
      {children}
    </FormSection>
  )
}

/**
 * Datos personales, contacto y dirección.
 * Debe usarse dentro de un <Form> cuyos valores incluyan `PersonalDataFormValues`.
 */
export function PersonalDataFields() {
  const { control } = useFormContext<PersonalDataFormValues>()

  return (
    <>
      <FormSection title="Datos personales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldText control={control} name="nombre" label="Nombre" required placeholder="John" />
          <FieldText control={control} name="primer_apellido" label="Primer apellido" required placeholder="Doe" />
          <FieldText control={control} name="segundo_apellido" label="Segundo apellido" placeholder="Smith" />
          <FieldSelect
            control={control}
            name="tipo_documento"
            label="Tipo de documento"
            required
            options={documentTypeOptions}
          />
          <FieldText
            control={control}
            name="numero_documento"
            label="Número de documento"
            required
            placeholder="12345678A"
          />
          <FieldText control={control} name="fecha_nacimiento" type="date" label="Fecha de nacimiento" required />
          <FieldSelect control={control} name="genero" label="Género" options={genderOptions} />
        </div>
      </FormSection>

      <FormSection title="Contacto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="telefono" type="tel" label="Teléfono" placeholder="+34 600 000 000" />
          <FieldText
            control={control}
            name="telefono_alternativo"
            type="tel"
            label="Teléfono alternativo"
            placeholder="+34 600 000 001"
          />
        </div>
      </FormSection>

      <FormSection title="Dirección">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="pais" label="País" placeholder="España" />
          <FieldText control={control} name="departamento" label="Departamento / Provincia" placeholder="Madrid" />
          <FieldText control={control} name="ciudad" label="Ciudad" placeholder="Madrid" />
          <FieldText control={control} name="codigo_postal" label="Código postal" placeholder="28001" />
          <FieldText
            control={control}
            name="direccion"
            label="Dirección"
            placeholder="Calle Mayor 1, 2º A"
            className="sm:col-span-2"
          />
        </div>
      </FormSection>
    </>
  )
}

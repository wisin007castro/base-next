'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormActions, FormStatus } from '@/app/components/form'
import { PersonalDataFields, UserAccountFields } from './UserFields'
import {
  createUserFormDefaults,
  createUserFormSchema,
  toCreateUserDto,
  type CreateUserFormValues,
} from '@/lib/forms/user.form'
import type { CreateUserDto } from '@/lib/types/user.types'

interface Props {
  onSubmit: (data: CreateUserDto) => Promise<unknown>
}

/** Alta de usuario: cuenta + datos personales. La edición usa secciones independientes. */
export function UserForm({ onSubmit }: Props) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: createUserFormDefaults,
  })

  return (
    <Form form={form} onSubmit={values => onSubmit(toCreateUserDto(values))} className="space-y-6">
      <FormStatus />
      <UserAccountFields passwordRequired />
      <PersonalDataFields />
      <FormActions submitLabel="Crear usuario" />
    </Form>
  )
}

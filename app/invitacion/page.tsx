'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  acceptInvitationFormSchema as formSchema,
  type AcceptInvitationFormValues as FormValues,
} from '@/lib/api/schemas/invitation.schema'
import { useAcceptInvitation, useInvitationPreview } from '@/lib/hooks/invitations.hooks'
import { FieldText, Form, FormStatus, SubmitButton } from '@/app/components/form'

const card = 'w-full max-w-sm rounded-2xl border border-[var(--line-2)] bg-surface p-8 shadow-sm'

function AcceptInvitation() {
  const token = useSearchParams().get('token') ?? ''
  const preview = useInvitationPreview(token)
  const accept = useAcceptInvitation()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '', password_confirmation: '' },
  })

  async function onSubmit(values: FormValues) {
    const { email } = await accept.mutateAsync({ ...values, token })
    // Cuenta creada: entrar directamente con lo que acaba de escribir
    const res = await signIn('credentials', { email, password: values.password, redirect: false })
    window.location.replace(res?.error ? '/login' : '/')
  }

  if (!token || preview.isError) {
    return (
      <div className={card}>
        <h1 className="mb-2 text-xl font-semibold text-ink-1">Invitación no válida</h1>
        <p role="alert" className="text-sm text-ink-3">
          {preview.error?.message ?? 'El enlace no tiene token.'} Pide a quien te invitó que te envíe una nueva.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
          Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  if (preview.isPending) return <p className="text-sm text-ink-3">Comprobando la invitación…</p>

  const { email, roles } = preview.data
  return (
    <div className={card}>
      <h1 className="mb-1 text-xl font-semibold text-ink-1">Crea tu cuenta</h1>
      <p className="mb-6 text-sm text-ink-3">
        Invitación para <strong className="text-ink-1">{email}</strong>
        {roles.length > 0 && ` · ${roles.join(', ')}`}
      </p>
      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <FormStatus />
        <FieldText control={form.control} name="username" label="Usuario" autoComplete="username" required />
        <FieldText
          control={form.control}
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
          required
        />
        <FieldText
          control={form.control}
          name="password_confirmation"
          type="password"
          label="Confirmar contraseña"
          autoComplete="new-password"
          required
        />
        <div className="pt-2">
          <SubmitButton pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
        </div>
      </Form>
    </div>
  )
}

export default function InvitacionPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Suspense>
        <AcceptInvitation />
      </Suspense>
    </div>
  )
}

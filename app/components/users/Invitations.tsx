'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { z } from '@/lib/validation/zod-config'
import { createInvitationSchema } from '@/lib/api/schemas/invitation.schema'
import type { Invitation } from '@/lib/types/invitation.types'
import { useRoles } from '@/lib/hooks/roles.hooks'
import {
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from '@/lib/hooks/invitations.hooks'
import { FieldCheckboxGroup, FieldText, Form, FormSection, FormStatus, SubmitButton } from '@/app/components/form'
import { ConfirmDialog, DataTable, RefBadges, createColumnHelper, formatDate } from '@/app/components/data-table'

const inviteFormSchema = z.object({
  email: createInvitationSchema.shape.email,
  role_ids: z.array(z.number()),
})
type InviteFormValues = z.input<typeof inviteFormSchema>

export function InviteForm() {
  const create = useCreateInvitation()
  const { data: roles, isLoading } = useRoles()
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: '', role_ids: [] },
  })

  return (
    <Form
      form={form}
      onSubmit={async values => {
        await create.mutateAsync(values)
        form.reset()
      }}
      className="space-y-4"
    >
      <FormSection title="Invitar por correo">
        <FormStatus />
        <FieldText control={form.control} name="email" type="email" label="Correo electrónico" required />
        <FieldCheckboxGroup
          control={form.control}
          name="role_ids"
          label="Roles"
          isLoading={isLoading}
          options={(roles ?? []).map(r => ({ value: r.id, label: r.name }))}
          emptyText="No hay roles definidos"
        />
        <div className="flex justify-end">
          <SubmitButton pendingText="Enviando...">Enviar invitación</SubmitButton>
        </div>
      </FormSection>
    </Form>
  )
}

const STATUS: Record<Invitation['status'], { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-[var(--warn-bg)] text-warn' },
  accepted: { label: 'Aceptada', className: 'bg-[var(--ok-bg)] text-ok' },
  expired: { label: 'Caducada', className: 'bg-[var(--line-1)] text-ink-3' },
}

const col = createColumnHelper<Invitation>()
const iconBtn = 'rounded p-1.5 transition-colors disabled:opacity-50'

export function InvitationsTable() {
  const { data, isLoading, isError } = useInvitations()
  const resend = useResendInvitation()
  const revoke = useRevokeInvitation()
  const [toRevoke, setToRevoke] = useState<Invitation | null>(null)

  const columns = [
    col.accessor('email', { header: 'Correo', meta: { className: 'font-medium text-ink-1' } }),
    col.accessor('status', {
      header: 'Estado',
      cell: ({ getValue }) => {
        const s = STATUS[getValue()]
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
      },
    }),
    col.display({ id: 'roles', header: 'Roles', cell: ({ row }) => <RefBadges items={row.original.roles} /> }),
    col.accessor(i => i.invited_by?.label ?? '—', { id: 'invited_by', header: 'Invitó' }),
    col.accessor('expires_at', {
      header: 'Caduca / aceptada',
      cell: ({ row: { original: i } }) => formatDate(i.accepted_at ?? i.expires_at),
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: i } }) =>
        i.status === 'accepted' ? null : (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => resend.mutate(i.id)}
              disabled={resend.isPending}
              title="Reenviar"
              className={`${iconBtn} text-accent hover:bg-[var(--accent-subtle)]`}
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setToRevoke(i)}
              title="Revocar"
              className={`${iconBtn} text-risk hover:bg-[var(--risk-bg)]`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
    }),
  ]

  return (
    <>
      <DataTable
        mode="client"
        columns={columns}
        data={data}
        getRowId={i => String(i.id)}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Error al cargar las invitaciones."
        emptyMessage="Todavía no hay invitaciones."
      />
      <ConfirmDialog
        open={!!toRevoke}
        title="Revocar invitación"
        confirmLabel="Revocar"
        pendingLabel="Revocando..."
        isPending={revoke.isPending}
        error={revoke.error?.message}
        onCancel={() => {
          setToRevoke(null)
          revoke.reset()
        }}
        onConfirm={() => toRevoke && revoke.mutate(toRevoke.id, { onSuccess: () => setToRevoke(null) })}
      >
        El enlace enviado a <strong className="text-ink-1">{toRevoke?.email}</strong> dejará de funcionar.
      </ConfirmDialog>
    </>
  )
}

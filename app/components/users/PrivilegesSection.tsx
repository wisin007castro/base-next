'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiTrash2 } from 'react-icons/fi'
import { z, DATE_RE } from '@/lib/validation/zod-config'
import type { Privilege } from '@/lib/types/rbac.types'
import { usePermissions } from '@/lib/hooks/permissions.hooks'
import { useRemovePrivilege, useSetPrivilege, useUserPrivileges } from '@/lib/hooks/users.hooks'
import { FieldSelect, FieldText, Form, FormStatus, SubmitButton } from '@/app/components/form'
import { ConfirmDialog, formatDate } from '@/app/components/data-table'

// Valores del formulario como strings ('' = vacío); se convierten al enviar
const formSchema = z.object({
  permission_id: z.number({ error: 'Elige un permiso' }).int().positive(),
  effect: z.enum(['grant', 'deny']),
  reason: z.string().max(255),
  expires_on: z.union([z.string().regex(DATE_RE), z.literal('')]),
})
type FormValues = z.input<typeof formSchema>

const effectOptions = [
  { value: 'grant', label: 'Conceder' },
  { value: 'deny', label: 'Denegar' },
] as const

function EffectBadge({ p }: { p: Privilege }) {
  if (!p.active) {
    return <span className="rounded-full bg-[var(--line-1)] px-2 py-0.5 text-xs text-ink-3">Caducado</span>
  }
  return p.effect === 'grant' ? (
    <span className="rounded-full bg-[var(--ok-bg)] px-2 py-0.5 text-xs font-medium text-ok">Concede</span>
  ) : (
    <span className="rounded-full bg-[var(--risk-bg)] px-2 py-0.5 text-xs font-medium text-risk">Deniega</span>
  )
}

/** Privilegios por usuario: conceder o denegar un permiso concreto, con motivo y caducidad */
export function PrivilegesSection({ userId, isAdmin }: { userId: number; isAdmin: boolean }) {
  const { data, isLoading } = useUserPrivileges(userId)
  const { data: allPerms } = usePermissions()
  const save = useSetPrivilege(userId)
  const remove = useRemovePrivilege(userId)
  const [toRemove, setToRemove] = useState<Privilege | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { effect: 'grant', reason: '', expires_on: '' },
  })

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line-2)] bg-surface p-4">
      <div className="mb-4 border-b border-[var(--line-2)] pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Privilegios</p>
        <p className="mt-1 text-xs text-ink-3">
          Conceden un permiso que sus roles no dan, o lo deniegan aunque un rol lo dé. Opcionalmente con caducidad.
          {isAdmin && ' Este usuario es administrador: tiene todos los permisos, las denegaciones no le afectan.'}
        </p>
      </div>

      <Form
        form={form}
        onSubmit={async v => {
          await save.mutateAsync({ ...v, permission_id: v.permission_id!, reason: v.reason || null })
          form.reset({ effect: 'grant', reason: '', expires_on: '' })
        }}
        className="space-y-3"
      >
        <FormStatus />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <FieldSelect
            control={form.control}
            name="permission_id"
            label="Permiso"
            options={(allPerms ?? []).map(p => ({ value: p.id, label: p.name }))}
            required
          />
          <FieldSelect control={form.control} name="effect" label="Efecto" options={effectOptions} />
          <FieldText control={form.control} name="reason" label="Motivo" placeholder="Opcional" />
          <FieldText
            control={form.control}
            name="expires_on"
            type="date"
            label="Válido hasta"
            hint="Vacío = sin caducidad"
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton>Guardar privilegio</SubmitButton>
        </div>
      </Form>

      {isLoading ? (
        <p className="text-xs text-ink-3">Cargando…</p>
      ) : data?.privileges.length ? (
        <ul className="divide-y divide-[var(--line-1)]" aria-label="Privilegios del usuario">
          {data.privileges.map(p => (
            <li key={p.permission.id} className="flex items-center gap-3 py-2 text-sm">
              <EffectBadge p={p} />
              <span className={`font-medium ${p.active ? 'text-ink-1' : 'text-ink-4 line-through'}`}>
                {p.permission.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink-3">
                {p.reason && `${p.reason} · `}
                {p.expires_at ? `hasta ${formatDate(p.expires_at)}` : 'sin caducidad'}
                {p.granted_by && ` · por ${p.granted_by.label}`}
              </span>
              <button
                type="button"
                onClick={() => setToRemove(p)}
                title="Quitar privilegio"
                className="rounded p-1.5 text-risk transition-colors hover:bg-[var(--risk-bg)]"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-3">Sin privilegios: solo cuentan los permisos de sus roles.</p>
      )}

      {data && (
        <div>
          <p className="mb-1 text-xs font-medium text-ink-2">Permisos efectivos ({data.effective.length})</p>
          <div className="flex flex-wrap gap-1" aria-label="Permisos efectivos">
            {data.effective.map(name => (
              <span key={name} className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-xs text-accent">
                {name}
              </span>
            ))}
            {!data.effective.length && <span className="text-xs italic text-ink-4">Ninguno</span>}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toRemove}
        title="Quitar privilegio"
        confirmLabel="Quitar"
        pendingLabel="Quitando..."
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToRemove(null)
          remove.reset()
        }}
        onConfirm={() => toRemove && remove.mutate(toRemove.permission.id, { onSuccess: () => setToRemove(null) })}
      >
        ¿Quitar el privilegio sobre <strong className="text-ink-1">{toRemove?.permission.name}</strong>? Volverá a valer
        lo que den sus roles.
      </ConfirmDialog>
    </div>
  )
}

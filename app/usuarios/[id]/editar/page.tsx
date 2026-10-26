'use client'
import { use } from 'react'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  useUser,
  useUpdateUser,
  useUserDirectPermissions,
  useGiveDirectPermission,
  useRevokeDirectPermission,
} from '@/lib/hooks/users.hooks'
import { usePermissions } from '@/lib/hooks/permissions.hooks'
import type { User } from '@/lib/types/user.types'
import { userKeys, meKeys } from '@/lib/constants/query-keys'
import {
  personalDataDefaults,
  personalDataFormSchema,
  toProfileDto,
  toUserAccountDto,
  userAccountDefaults,
  userAccountFormSchema,
  type PersonalDataFormValues,
  type UserAccountFormValues,
} from '@/lib/forms/user.form'
import { Form, FormStatus, SubmitButton } from '@/app/components/form'
import { PersonalDataFields, UserAccountFields } from '@/app/components/users/UserFields'
import AvatarUpload from '@/app/components/users/AvatarUpload'

interface Props {
  params: Promise<{ id: string }>
}

const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass =
  'text-xs font-semibold uppercase tracking-wider text-accent border-b border-[var(--line-2)] pb-2 mb-4'

// ---------------------------------------------------------------------------
// Sección: Datos de cuenta
// ---------------------------------------------------------------------------
function AccountSection({ user, userId }: { user: User; userId: number }) {
  const update = useUpdateUser(userId)
  const form = useForm<UserAccountFormValues>({
    resolver: zodResolver(userAccountFormSchema),
    defaultValues: userAccountDefaults(user),
  })

  async function handleSubmit(values: UserAccountFormValues) {
    await update.mutateAsync(toUserAccountDto(values))
    // Limpia las contraseñas y deja los valores guardados como nuevo "estado limpio"
    form.reset({ ...values, password: '', password_confirmation: '' }, { keepIsSubmitSuccessful: true })
  }

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <FormStatus />
      <UserAccountFields>
        <div className="flex justify-end pt-1">
          <SubmitButton>Actualizar cuenta</SubmitButton>
        </div>
      </UserAccountFields>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Sección: Datos personales, contacto y dirección
// ---------------------------------------------------------------------------
function PersonalSection({ user, userId }: { user: User; userId: number }) {
  const update = useUpdateUser(userId)
  const form = useForm<PersonalDataFormValues>({
    resolver: zodResolver(personalDataFormSchema),
    defaultValues: personalDataDefaults(user.profile),
  })

  return (
    <Form form={form} onSubmit={values => update.mutateAsync({ profile: toProfileDto(values) })} className="space-y-4">
      <FormStatus />
      <PersonalDataFields />
      <div className="flex justify-end">
        <SubmitButton>Actualizar datos personales</SubmitButton>
      </div>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Sección: Permisos directos
// ---------------------------------------------------------------------------
function DirectPermissionsSection({ userId }: { userId: number }) {
  const { data: directPerms, isLoading: loadingDirect } = useUserDirectPermissions(userId)
  const { data: allPerms, isLoading: loadingAll } = usePermissions()
  const give = useGiveDirectPermission(userId)
  const revoke = useRevokeDirectPermission(userId)

  const directIds = new Set(directPerms?.map(p => p.id) ?? [])

  // Actualización optimista: el checkbox cambia al instante y se revierte si falla
  function togglePermission(permId: number, hasIt: boolean) {
    if (hasIt) revoke.mutate(permId)
    else give.mutate(permId)
  }

  return (
    <div className={sectionClass}>
      <p className={sectionTitleClass}>Permisos directos</p>
      <p className="-mt-2 mb-2 text-xs text-ink-3">
        Permisos asignados directamente a este usuario, independientes de sus roles.
      </p>

      {loadingDirect || loadingAll ? (
        <p className="text-xs text-ink-3">Cargando permisos...</p>
      ) : !allPerms?.length ? (
        <p className="text-xs text-ink-3">No hay permisos definidos en el sistema.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {allPerms.map(perm => {
            const hasIt = directIds.has(perm.id)
            return (
              <label key={perm.id} className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  className="focus:ring-[var(--accent)]/30 rounded border-[var(--line-3)] text-accent"
                  checked={hasIt}
                  onChange={() => togglePermission(perm.id, hasIt)}
                />
                <span className="text-sm text-ink-2">{perm.name}</span>
                {perm.description && <span className="text-xs text-ink-4">— {perm.description}</span>}
              </label>
            )
          })}
        </div>
      )}

      {(give.isError || revoke.isError) && (
        <p className="mt-2 text-xs text-risk">Error al modificar el permiso. Inténtalo de nuevo.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function EditarUsuarioPage({ params }: Props) {
  const { id } = use(params)
  const userId = Number(id)
  const qc = useQueryClient()

  const { data: user, isLoading, isError } = useUser(userId)

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-ink-3">Cargando usuario...</div>
  }

  if (isError || !user) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">No se pudo cargar el usuario.</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Editar usuario</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {user.username} · {user.email}
          </p>
        </div>
        <Link
          href="/usuarios"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-[var(--line-1)]"
        >
          <FiArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </div>

      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={user.profile?.avatar_url}
          uploadUrl={`/api/upload/avatar/${userId}`}
          onUploaded={() => {
            qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
            qc.invalidateQueries({ queryKey: userKeys.lists() })
            // Si el admin se edita a sí mismo, el avatar del Header también cambia
            qc.invalidateQueries({ queryKey: meKeys.detail() })
          }}
        />
      </div>

      <AccountSection user={user} userId={userId} />
      <PersonalSection user={user} userId={userId} />
      <DirectPermissionsSection userId={userId} />
    </div>
  )
}

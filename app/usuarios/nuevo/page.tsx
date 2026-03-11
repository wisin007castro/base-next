'use client'
import { useRouter } from 'next/navigation'
import { UserForm } from '@/app/components/users/UserForm'
import { useCreateUser } from '@/lib/hooks/users.hooks'
import type { CreateUserDto } from '@/lib/types/user.types'

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const create = useCreateUser()

  async function handleSubmit(data: CreateUserDto) {
    await create.mutateAsync(data)
    router.push('/usuarios')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Nuevo usuario</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          Completa los datos de cuenta y perfil personal.
        </p>
      </div>

      {create.isError && (
        <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
          {(create.error as Error)?.message ?? 'Error al crear el usuario.'}
        </div>
      )}

      <UserForm mode="create" onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  )
}

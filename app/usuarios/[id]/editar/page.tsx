'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { UserForm } from '@/app/components/users/UserForm'
import { useUser, useUpdateUser } from '@/lib/hooks/users.hooks'
import type { UpdateUserDto } from '@/lib/types/user.types'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditarUsuarioPage({ params }: Props) {
  const { id } = use(params)
  const userId = Number(id)
  const router = useRouter()

  const { data: user, isLoading, isError } = useUser(userId)
  const update = useUpdateUser(userId)

  async function handleSubmit(data: UpdateUserDto) {
    await update.mutateAsync(data)
    router.push('/usuarios')
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando usuario...</div>
  }

  if (isError || !user) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        No se pudo cargar el usuario.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar usuario</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {user.username} · {user.email}
        </p>
      </div>

      {update.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {(update.error as Error)?.message ?? 'Error al actualizar el usuario.'}
        </div>
      )}

      <UserForm mode="edit" user={user} onSubmit={handleSubmit} isLoading={update.isPending} />
    </div>
  )
}

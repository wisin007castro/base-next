'use client'
import { useRouter } from 'next/navigation'
import { useCreateRole } from '@/lib/hooks/roles.hooks'
import { RoleForm } from '@/app/components/roles/RoleForm'
import type { CreateRoleDto } from '@/lib/types/rbac.types'

export default function NuevoRolPage() {
  const router = useRouter()
  const create = useCreateRole()

  function handleSubmit(data: CreateRoleDto) {
    create.mutate(data, { onSuccess: () => router.push('/roles') })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nuevo rol</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Completa los datos para crear un nuevo rol</p>
      </div>

      {create.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {create.error?.message ?? 'Error al crear el rol'}
        </div>
      )}

      <RoleForm mode="create" onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  )
}

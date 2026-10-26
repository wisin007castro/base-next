'use client'
import { useRouter } from 'next/navigation'
import { useCreateRole } from '@/lib/hooks/roles.hooks'
import { RoleForm } from '@/app/components/roles/RoleForm'
import type { CreateRoleDto } from '@/lib/types/rbac.types'

export default function NuevoRolPage() {
  const router = useRouter()
  const create = useCreateRole()

  async function handleSubmit(data: CreateRoleDto) {
    await create.mutateAsync(data)
    router.push('/roles')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nuevo rol</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Completa los datos para crear un nuevo rol</p>
      </div>

      <RoleForm onSubmit={handleSubmit} />
    </div>
  )
}

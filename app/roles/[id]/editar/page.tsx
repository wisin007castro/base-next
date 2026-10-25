'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useRole, useUpdateRole } from '@/lib/hooks/roles.hooks'
import { RoleForm } from '@/app/components/roles/RoleForm'
import type { UpdateRoleDto } from '@/lib/types/rbac.types'

export default function EditarRolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const roleId = Number(id)
  const router = useRouter()

  const { data: role, isLoading, isError } = useRole(roleId)
  const update = useUpdateRole(roleId)

  async function handleSubmit(data: UpdateRoleDto) {
    await update.mutateAsync(data)
    router.push('/roles')
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando rol...</div>
  }

  if (isError || !role) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        Rol no encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar rol</h1>
        <p className="mt-0.5 text-sm capitalize text-gray-500 dark:text-gray-400">{role.name}</p>
      </div>

      <RoleForm role={role} onSubmit={handleSubmit} />
    </div>
  )
}

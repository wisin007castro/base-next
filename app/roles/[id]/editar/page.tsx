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

  function handleSubmit(data: UpdateRoleDto) {
    update.mutate(data, { onSuccess: () => router.push('/roles') })
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando rol...</div>
  }

  if (isError || !role) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        Rol no encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar rol</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 capitalize">{role.name}</p>
      </div>

      {update.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {update.error?.message ?? 'Error al actualizar el rol'}
        </div>
      )}

      <RoleForm mode="edit" role={role} onSubmit={handleSubmit} isLoading={update.isPending} />
    </div>
  )
}

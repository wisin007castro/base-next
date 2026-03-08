'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { usePermission, useUpdatePermission } from '@/lib/hooks/permissions.hooks'
import { PermissionForm } from '@/app/components/permissions/PermissionForm'
import type { UpdatePermissionDto } from '@/lib/api/permissions.api'

export default function EditarPermisoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const permId = Number(id)
  const router = useRouter()

  const { data: permission, isLoading, isError } = usePermission(permId)
  const update = useUpdatePermission(permId)

  function handleSubmit(data: UpdatePermissionDto) {
    update.mutate(data, { onSuccess: () => router.push('/permisos') })
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando permiso...</div>
  }

  if (isError || !permission) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        Permiso no encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar permiso</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{permission.name}</p>
      </div>

      {update.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {update.error?.message ?? 'Error al actualizar el permiso'}
        </div>
      )}

      <PermissionForm mode="edit" permission={permission} onSubmit={handleSubmit} isLoading={update.isPending} />
    </div>
  )
}

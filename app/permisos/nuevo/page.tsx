'use client'
import { useRouter } from 'next/navigation'
import { useCreatePermission } from '@/lib/hooks/permissions.hooks'
import { PermissionForm } from '@/app/components/permissions/PermissionForm'
import type { CreatePermissionDto } from '@/lib/types/rbac.types'

export default function NuevoPermisoPage() {
  const router = useRouter()
  const create = useCreatePermission()

  function handleSubmit(data: CreatePermissionDto) {
    create.mutate(data, { onSuccess: () => router.push('/permisos') })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nuevo permiso</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Completa los datos para crear un nuevo permiso</p>
      </div>

      {create.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {create.error?.message ?? 'Error al crear el permiso'}
        </div>
      )}

      <PermissionForm mode="create" onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  )
}

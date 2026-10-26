'use client'
import { useRouter } from 'next/navigation'
import { useCreatePermission } from '@/lib/hooks/permissions.hooks'
import { PermissionForm } from '@/app/components/permissions/PermissionForm'
import type { CreatePermissionDto } from '@/lib/types/rbac.types'

export default function NuevoPermisoPage() {
  const router = useRouter()
  const create = useCreatePermission()

  async function handleSubmit(data: CreatePermissionDto) {
    await create.mutateAsync(data)
    router.push('/permisos')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nuevo permiso</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Completa los datos para crear un nuevo permiso
        </p>
      </div>

      <PermissionForm onSubmit={handleSubmit} />
    </div>
  )
}

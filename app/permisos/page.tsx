'use client'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { usePermissions, useDeletePermission } from '@/lib/hooks/permissions.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { listSearchSchema } from '@/lib/filters/list.filters'
import { PermissionsTable } from '@/app/components/permissions/PermissionsTable'
import { ConfirmDialog, FilterBar, SearchFilter } from '@/app/components/data-table'
import type { Permission } from '@/lib/types/rbac.types'

function PermisosContent() {
  const { data: permissions, isLoading, isError } = usePermissions()
  const remove = useDeletePermission()
  const [toDelete, setToDelete] = useState<Permission | null>(null)
  const [search, setSearch, resetSearch] = useUrlState(listSearchSchema)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Permisos</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {permissions ? `${permissions.length} permisos registrados` : 'Gestión de permisos del sistema'}
          </p>
        </div>
        <Link
          href="/permisos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <FiPlus className="h-4 w-4" />
          Nuevo permiso
        </Link>
      </div>

      <FilterBar hasActive={!!search.q} onClear={resetSearch}>
        <SearchFilter value={search.q} onChange={q => setSearch({ q })} placeholder="Buscar permisos..." />
      </FilterBar>

      <PermissionsTable
        permissions={permissions}
        // Lista pequeña: TanStack Table filtra y ordena en el cliente; el estado vive en la URL
        globalFilter={search.q}
        isLoading={isLoading}
        isError={isError}
        sort={search.sort}
        onSortChange={sort => setSearch({ sort })}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar permiso"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar el permiso <strong className="text-ink-1">{toDelete?.name}</strong>? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}

export default function PermisosPage() {
  return (
    <Suspense>
      <PermisosContent />
    </Suspense>
  )
}

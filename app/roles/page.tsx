'use client'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useRoles, useDeleteRole } from '@/lib/hooks/roles.hooks'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { listSearchSchema } from '@/lib/filters/list.filters'
import { RolesTable } from '@/app/components/roles/RolesTable'
import { ConfirmDialog, FilterBar, SearchFilter } from '@/app/components/data-table'
import type { Role } from '@/lib/types/rbac.types'

function RolesContent() {
  const { data: roles, isLoading, isError } = useRoles()
  const remove = useDeleteRole()
  const [toDelete, setToDelete] = useState<Role | null>(null)
  const [search, setSearch, resetSearch] = useUrlState(listSearchSchema)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Roles</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {roles ? `${roles.length} roles registrados` : 'Gestión de roles del sistema'}
          </p>
        </div>
        <Link
          href="/roles/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <FiPlus className="h-4 w-4" />
          Nuevo rol
        </Link>
      </div>

      <FilterBar hasActive={!!search.q} onClear={resetSearch}>
        <SearchFilter value={search.q} onChange={q => setSearch({ q })} placeholder="Buscar roles..." />
      </FilterBar>

      <RolesTable
        roles={roles}
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
        title="Eliminar rol"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar el rol <strong className="text-ink-1">{toDelete?.name}</strong>? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}

export default function RolesPage() {
  return (
    <Suspense>
      <RolesContent />
    </Suspense>
  )
}

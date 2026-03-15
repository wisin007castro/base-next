'use client'
import { useState } from 'react'
import { usePermissions } from '@/lib/hooks/permissions.hooks'
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/lib/types/rbac.types'

interface CreateProps {
  mode: 'create'
  onSubmit: (data: CreateRoleDto) => void
  isLoading?: boolean
}

interface EditProps {
  mode: 'edit'
  role: Role
  onSubmit: (data: UpdateRoleDto) => void
  isLoading?: boolean
}

type Props = CreateProps | EditProps

const inputClass = 'field-input'

const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wider text-accent border-b border-[var(--line-2)] pb-2 mb-4'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

export function RoleForm(props: Props) {
  const { mode, onSubmit, isLoading } = props
  const initial = mode === 'edit' ? props.role : null

  const { data: allPermissions, isLoading: permsLoading } = usePermissions()

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [permissionIds, setPermissionIds] = useState<number[]>(
    initial?.permissions?.map(p => p.id) ?? []
  )
  const [search, setSearch] = useState('')

  function togglePermission(id: number) {
    setPermissionIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function toggleAll(filtered: number[]) {
    const allSelected = filtered.every(id => permissionIds.includes(id))
    if (allSelected) {
      setPermissionIds(prev => prev.filter(id => !filtered.includes(id)))
    } else {
      setPermissionIds(prev => [...new Set([...prev, ...filtered])])
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dto = { name, description: description || undefined, permission_ids: permissionIds }
    onSubmit(dto as CreateRoleDto & UpdateRoleDto)
  }

  const filtered = (allPermissions ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredIds = filtered.map(p => p.id)
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => permissionIds.includes(id))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos del rol */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos del rol</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="admin"
            />
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción del rol"
            />
          </Field>
        </div>
      </div>

      {/* Permisos */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-3">
          <p className={sectionTitleClass + ' mb-0'}>Permisos</p>
          <span className="text-xs text-gray-400">{permissionIds.length} seleccionados</span>
        </div>

        <input
          className={inputClass}
          placeholder="Filtrar permisos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {permsLoading ? (
          <p className="text-xs text-gray-400">Cargando permisos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin resultados</p>
        ) : (
          <>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                checked={allFilteredSelected}
                onChange={() => toggleAll(filteredIds)}
              />
              Seleccionar todos ({filteredIds.length})
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
              {filtered.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 shrink-0"
                    checked={permissionIds.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={perm.name}>
                    {perm.name}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
        >
          {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear rol' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

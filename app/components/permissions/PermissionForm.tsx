'use client'
import { useState } from 'react'
import type { Permission, CreatePermissionDto } from '@/lib/types/rbac.types'
import type { UpdatePermissionDto } from '@/lib/api/permissions.api'

interface CreateProps {
  mode: 'create'
  onSubmit: (data: CreatePermissionDto) => void
  isLoading?: boolean
}

interface EditProps {
  mode: 'edit'
  permission: Permission
  onSubmit: (data: UpdatePermissionDto) => void
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

export function PermissionForm(props: Props) {
  const { mode, onSubmit, isLoading } = props
  const initial = mode === 'edit' ? props.permission : null

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, description: description || undefined } as CreatePermissionDto & UpdatePermissionDto)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos del permiso</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="users.create"
            />
            <p className="mt-1 text-xs text-gray-400">Usa formato dot-notation: recurso.acción</p>
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Puede crear usuarios"
            />
          </Field>
        </div>
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
          {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear permiso' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

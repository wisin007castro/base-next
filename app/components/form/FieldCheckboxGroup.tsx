'use client'
import { useState } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { FormField, useFieldId } from './FormField'

export interface CheckboxOption<V extends string | number> {
  value: V
  label: string
}

interface Props<T extends FieldValues, V extends string | number> {
  control: Control<T>
  name: Path<T>
  options: readonly CheckboxOption<V>[]
  label?: string
  hint?: string
  isLoading?: boolean
  /** Muestra buscador + "Seleccionar todos" (útil con listas largas) */
  searchable?: boolean
  emptyText?: string
  className?: string
  optionClassName?: string
}

/** Selección múltiple de un array de ids (roles, permisos…) */
export function FieldCheckboxGroup<T extends FieldValues, V extends string | number>({
  control,
  name,
  options,
  label,
  hint,
  isLoading,
  searchable,
  emptyText = 'Sin opciones',
  className,
  optionClassName = 'flex flex-wrap gap-4',
}: Props<T, V>) {
  const { field, fieldState } = useController({ control, name })
  const id = useFieldId(name)
  const [search, setSearch] = useState('')
  const selected: V[] = field.value ?? []
  const error = fieldState.error?.message

  const visible = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options
  const visibleValues = visible.map(o => o.value)
  const allVisibleSelected = visibleValues.length > 0 && visibleValues.every(v => selected.includes(v))

  function toggle(value: V) {
    field.onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  function toggleAllVisible() {
    field.onChange(
      allVisibleSelected
        ? selected.filter(v => !visibleValues.includes(v))
        : [...new Set([...selected, ...visibleValues])],
    )
  }

  return (
    <FormField id={id} label={label} hint={hint} error={error} className={className}>
      {searchable && (
        <div className="mb-3 flex items-center gap-3">
          <input
            className="field-input"
            placeholder="Filtrar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={`Filtrar ${label ?? ''}`}
          />
          <span className="shrink-0 text-xs text-ink-3">{selected.length} seleccionados</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-ink-3">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs italic text-ink-3">{search ? 'Sin resultados' : emptyText}</p>
      ) : (
        <>
          {searchable && (
            <label className="mb-2 flex cursor-pointer select-none items-center gap-2 border-b border-[var(--line-1)] pb-2 text-sm text-ink-3">
              <input
                type="checkbox"
                className="focus:ring-[var(--accent)]/30 rounded border-[var(--line-3)] text-accent"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
              />
              Seleccionar todos ({visibleValues.length})
            </label>
          )}
          <div ref={field.ref} tabIndex={-1} className={optionClassName}>
            {visible.map(o => (
              <label key={o.value} className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  className="focus:ring-[var(--accent)]/30 shrink-0 rounded border-[var(--line-3)] text-accent"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  onBlur={field.onBlur}
                />
                <span className="truncate text-sm text-ink-2" title={o.label}>
                  {o.label}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </FormField>
  )
}

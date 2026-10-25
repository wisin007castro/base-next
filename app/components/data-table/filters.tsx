'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

const controlClass = 'field-input w-auto'

/**
 * Buscador con debounce: escribe en el estado (URL) 300 ms después de dejar de teclear.
 * Si el valor externo cambia (atrás/adelante, "Limpiar"), se sincroniza.
 */
export function SearchFilter({
  value,
  onChange,
  placeholder = 'Buscar…',
  delay = 300,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
}) {
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onChangeRef.current(draft.trim()), delay)
    return () => clearTimeout(t)
  }, [draft, value, delay])

  return (
    <div className="border-accent/30 focus-within:ring-accent/20 flex min-w-56 flex-1 items-center gap-2 rounded-lg border bg-surface-inset px-3 py-2 focus-within:border-accent focus-within:ring-2">
      <FiSearch className="h-4 w-4 shrink-0 text-ink-3" />
      <input
        type="search"
        className="flex-1 bg-transparent text-sm text-ink-1 outline-none placeholder:text-ink-4"
        placeholder={placeholder}
        aria-label={placeholder}
        value={draft}
        onChange={e => setDraft(e.target.value)}
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Limpiar búsqueda"
          className="text-ink-3 hover:text-ink-1"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/** Select de filtro con opción "todos" (valor vacío = sin filtro) */
export function SelectFilter({
  value,
  onChange,
  options,
  allLabel,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
  label?: string
}) {
  return (
    <select
      className={controlClass}
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label ?? allLabel}
    >
      <option value="">{allLabel}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Checkbox de filtro booleano */
export function ToggleFilter({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" className="rounded" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/** Input de fecha con label para paneles de filtros avanzados */
export function DateFilter({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      <input type="date" className="field-input" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

/** Fila de filtros + botón "Limpiar filtros" cuando hay alguno activo */
export function FilterBar({
  children,
  hasActive,
  onClear,
}: {
  children: ReactNode
  hasActive?: boolean
  onClear?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      {hasActive && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-risk"
        >
          <FiX className="h-4 w-4" />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

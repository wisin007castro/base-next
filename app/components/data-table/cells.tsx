/** Celdas comunes para columnas de DataTable (las usan los módulos generados) */

export function YesNoBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex rounded-full bg-[var(--ok-bg)] px-2.5 py-0.5 text-xs font-medium text-ok">Sí</span>
  ) : (
    <span className="inline-flex rounded-full bg-[var(--line-2)] px-2.5 py-0.5 text-xs font-medium text-ink-3">No</span>
  )
}

/** `AAAA-MM-DD` → `DD/MM/AAAA` sin pasar por Date (evita el desfase de zona horaria) */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : value
}

/** Etiqueta de un valor de enum a partir de sus opciones */
export function labelOf<V extends string>(options: readonly { value: V; label: string }[], value: V): string {
  return options.find(o => o.value === value)?.label ?? value
}

/** Varias relaciones (many) como badges: muestra las primeras y "+N" */
export function RefBadges({ items, max = 3 }: { items: { id: number; label: string }[]; max?: number }) {
  if (!items.length) return <span className="italic text-ink-4">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, max).map(i => (
        <span key={i.id} className="inline-flex rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-xs text-accent">
          {i.label}
        </span>
      ))}
      {items.length > max && <span className="text-xs text-ink-4">+{items.length - max}</span>}
    </div>
  )
}

/** Marca de registro eliminado (soft delete) */
export function DeletedBadge() {
  return (
    <span className="inline-flex rounded-full bg-[var(--risk-bg)] px-2.5 py-0.5 text-xs font-medium text-risk">
      Eliminado
    </span>
  )
}

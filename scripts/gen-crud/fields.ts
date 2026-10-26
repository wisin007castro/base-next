import { humanize, toCamel } from './names'

export const FIELD_TYPES = ['string', 'text', 'int', 'number', 'boolean', 'date', 'enum', 'ref', 'many'] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const ON_DELETE = ['restrict', 'cascade', 'set null'] as const
export type OnDelete = (typeof ON_DELETE)[number]

/** Módulo al que apunta un campo `ref` / `many` (resuelto desde el registro de módulos generados) */
export interface RefTarget {
  /** snake plural del módulo: `categorias` */
  plural: string
  /** snake singular: `categoria` (para nombrar la FK en tablas intermedias) */
  entity: string
  /** Identificador de la tabla Drizzle: `categorias`, `users` */
  table: string
  /** Columna Drizzle (camelCase) que se muestra como etiqueta, o null → `#id` */
  displayCamel: string | null
  /** El destino tiene soft delete: sus eliminados no se ofrecen ni se muestran */
  softDelete: boolean
  /** Módulo generado (tiene hook de opciones); null para `users` (solo owner) */
  module: { PascalPlural: string; camelPlural: string; kebabPlural: string } | null
}

export interface Field {
  /** snake_case: nombre en la API, la URL y la columna SQL */
  name: string
  /** camelCase: propiedad en la tabla Drizzle */
  camel: string
  label: string
  type: FieldType
  optional: boolean
  unique: boolean
  /** Solo `enum` */
  values: string[]
  /** Solo `ref` / `many`: módulo destino tal como se escribió (`categorias`), se resuelve en `ref` */
  refPlural?: string
  ref?: RefTarget
  /** Solo `ref`: qué hacer con este registro cuando se elimina el destino */
  onDelete?: OnDelete
  /** Campo de sistema: el autor, lo pone el servidor desde la sesión (no está en el form) */
  owner?: boolean
}

const RESERVED = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'search',
  'page',
  'per_page',
  'sort',
  'with_trashed',
  'autor_id',
]

/**
 * Parsea `nombre[?][!]:tipo[=Etiqueta]`:
 *   `nombre:string`  `descripcion?:text`  `codigo!:string`  `estado:enum(borrador|publicado)`
 *   `categoria_id:ref(categorias)`  `categoria_id:ref(categorias,cascade)`  `etiqueta_ids:many(etiquetas)`
 *   `?` = opcional, `!` = único, `=…` = etiqueta en la UI (por defecto se deriva del nombre)
 */
export function parseField(spec: string): Field {
  const m = spec.match(/^([a-z][a-z0-9_]*)([?!]*):([a-z]+)(?:\(([^)]*)\))?(?:=(.+))?$/)
  if (!m) throw new Error(`Campo inválido "${spec}". Formato: nombre[?][!]:tipo  (ej. precio:number, estado:enum(a|b))`)
  const [, name, flags, type, args, customLabel] = m
  if (!FIELD_TYPES.includes(type as FieldType)) {
    throw new Error(`Tipo "${type}" no soportado en "${spec}". Tipos: ${FIELD_TYPES.join(', ')}`)
  }
  if (RESERVED.includes(name)) throw new Error(`"${name}" es un nombre reservado`)
  if (customLabel?.includes("'")) throw new Error(`"${name}": la etiqueta no puede contener comillas simples`)
  const values =
    type === 'enum'
      ? (args ?? '')
          .split('|')
          .map(v => v.trim())
          .filter(Boolean)
      : []
  if (type === 'enum' && values.length < 2)
    throw new Error(`El enum "${name}" necesita al menos 2 valores: ${name}:enum(a|b)`)
  if (values.some(v => !/^[a-z0-9_]+$/.test(v)))
    throw new Error(`Valores de "${name}" en snake_case: ${values.join('|')}`)
  if (type === 'boolean' && flags.includes('?'))
    throw new Error(`"${name}": un boolean no puede ser opcional (usa default false)`)

  let refPlural: string | undefined
  let onDelete: OnDelete | undefined
  if (type === 'ref' || type === 'many') {
    const [target, policy] = (args ?? '').split(',').map(s => s.trim())
    if (!target || !/^[a-z][a-z0-9_]*$/.test(target))
      throw new Error(`"${name}": indica el módulo destino: ${name}:${type}(categorias)`)
    if (flags.includes('!')) throw new Error(`"${name}": un ${type} no puede ser único`)
    refPlural = target
    if (type === 'ref') {
      if (!name.endsWith('_id'))
        throw new Error(`"${name}": un ref debe terminar en _id (ej. categoria_id:ref(categorias))`)
      if (policy && !ON_DELETE.includes(policy as OnDelete)) {
        throw new Error(`"${name}": política "${policy}" inválida. Usa: ${ON_DELETE.join(', ')}`)
      }
      if (policy === 'set null' && !flags.includes('?'))
        throw new Error(`"${name}": "set null" exige un ref opcional (${name}?:ref(...))`)
      // Por defecto: requerido → no se puede borrar el destino con hijos; opcional → se desvincula
      onDelete = (policy as OnDelete) ?? (flags.includes('?') ? 'set null' : 'restrict')
    } else {
      if (!name.endsWith('_ids'))
        throw new Error(`"${name}": un many debe terminar en _ids (ej. etiqueta_ids:many(etiquetas))`)
      if (policy) throw new Error(`"${name}": many no admite política (la tabla intermedia se borra en cascada)`)
    }
  }

  return {
    name,
    camel: toCamel(name),
    label:
      customLabel?.trim() ||
      humanize(type === 'ref' ? name.slice(0, -3) : type === 'many' ? (refPlural as string) : name),
    type: type as FieldType,
    optional: flags.includes('?'),
    unique: flags.includes('!'),
    values,
    refPlural,
    onDelete,
  }
}

/** Campo autor (`--owner`): FK a users, lo asigna el servidor */
export const ownerField = (users: RefTarget): Field => ({
  name: 'autor_id',
  camel: 'autorId',
  label: 'Autor',
  type: 'ref',
  optional: false,
  unique: false,
  values: [],
  ref: users,
  onDelete: 'cascade',
  owner: true,
})

/**
 * Nombre de la relación en la API:
 * `categoria_id` (ref) → `categoria: { id, label }`; `etiqueta_ids` (many) → `etiquetas: [{ id, label }]`
 */
export const relName = (f: Field) => (f.type === 'many' ? f.ref!.plural : f.name.slice(0, -3))
export const relCamel = (f: Field) => toCamel(relName(f))
/** Alias de la tabla destino en los joins (soporta varios refs a la misma tabla) */
export const refAlias = (f: Field) => `${relCamel(f)}Ref`
/** Variable con las opciones del select en el form/listado */
export const refOptionsVar = (f: Field) => `${f.ref!.module!.camelPlural}Options`

const STRING_MAX = { string: 255, text: 5000 } as const
const isStringLike = (f: Field) => f.type === 'string' || f.type === 'text' || f.type === 'date' || f.type === 'enum'
/** Columna propia de la tabla (many vive en la tabla intermedia) */
export const isColumn = (f: Field) => f.type !== 'many'
export const isSearchable = (f: Field) => f.type === 'string' || f.type === 'text'
export const isFilterable = (f: Field) =>
  f.type === 'boolean' || f.type === 'enum' || ((f.type === 'ref' || f.type === 'many') && !f.owner && !!f.ref?.module)
export const isSortable = (f: Field) =>
  f.type !== 'text' && f.type !== 'many' && (f.type !== 'ref' || !!f.ref?.displayCamel)
export const enumConst = (entityConst: string, f: Field) => `${entityConst}_${f.name.toUpperCase()}_VALUES`
export const enumOptions = (entityConst: string, f: Field) => `${entityConst}_${f.name.toUpperCase()}_OPTIONS`

// ─── Drizzle ──────────────────────────────────────────────────────────────────
export function drizzleColumn(f: Field, entityConst: string): string {
  let col: string
  switch (f.type) {
    case 'int':
      col = `integer('${f.name}')`
      break
    case 'number':
      col = `real('${f.name}')`
      break
    case 'boolean':
      return `integer('${f.name}', { mode: 'boolean' }).notNull().default(false)`
    case 'enum':
      col = `text('${f.name}', { enum: ${enumConst(entityConst, f)} })`
      break
    case 'ref':
      // La misma política en la FK: aplica a los borrados físicos (y al soft delete vía lib/api/dependents)
      col = `integer('${f.name}').references(() => ${f.ref!.table}.id, { onDelete: '${f.onDelete}' })`
      break
    case 'many':
      throw new Error('many no es una columna')
    default:
      col = `text('${f.name}')`
  }
  if (!f.optional) col += '.notNull()'
  return col
}

// ─── Zod (servidor: fuente de verdad) ─────────────────────────────────────────
export function zodServer(f: Field, entityConst: string): string {
  let z: string
  switch (f.type) {
    case 'string':
    case 'text':
      z = f.optional
        ? `z.string().trim().max(${STRING_MAX[f.type]})`
        : `z.string().trim().min(1).max(${STRING_MAX[f.type]})`
      break
    case 'int':
      z = 'z.number().int()'
      break
    case 'number':
      z = 'z.number()'
      break
    case 'boolean':
      return 'z.boolean()'
    case 'date':
      z = f.optional
        ? `z.string().regex(DATE_RE, 'Fecha inválida (AAAA-MM-DD)')`
        : `z.string().min(1).regex(DATE_RE, 'Fecha inválida (AAAA-MM-DD)')`
      break
    case 'enum':
      z = `z.enum(${enumConst(entityConst, f)})`
      break
    case 'ref':
      z = 'z.number().int().positive()'
      break
    case 'many':
      return f.optional
        ? 'z.array(z.number().int().positive()).max(100).optional()'
        : "z.array(z.number().int().positive()).min(1, 'Selecciona al menos uno').max(100)"
  }
  return f.optional ? `${z}.nullish()` : z
}

// ─── Formulario ───────────────────────────────────────────────────────────────
/** Regla del form: requerido = la del servidor; opcional = versión que acepta '' / null / [] */
export function zodForm(f: Field, entityConst: string, schemaVar: string): string {
  if (!f.optional) return `${schemaVar}.shape.${f.name}`
  switch (f.type) {
    case 'string':
    case 'text':
      return `z.string().max(${STRING_MAX[f.type]})`
    case 'date':
      return `z.union([z.literal(''), z.string().regex(DATE_RE, 'Fecha inválida (AAAA-MM-DD)')])`
    case 'enum':
      return `z.union([z.literal(''), z.enum(${enumConst(entityConst, f)})])`
    case 'ref':
      return 'z.number().int().positive().nullable()'
    case 'many':
      return 'z.array(z.number().int().positive()).max(100)'
    default:
      return `z.number()${f.type === 'int' ? '.int()' : ''}.nullable()`
  }
}

/** Valor inicial del form a partir de la entidad (`e`) */
export function formDefault(f: Field): string {
  if (f.type === 'boolean') return `e?.${f.name} ?? false`
  if (f.type === 'many') return `e?.${f.name} ?? []`
  // Requerido vacío = undefined (DefaultValues no admite null); el input lo muestra vacío
  if (f.type === 'int' || f.type === 'number' || f.type === 'ref') {
    return f.optional ? `e?.${f.name} ?? null` : `e?.${f.name}`
  }
  if (f.type === 'enum' && !f.optional) return `e?.${f.name} ?? '${f.values[0]}'`
  return `e?.${f.name} ?? ''`
}

/** Valor del form → DTO ('' de los opcionales → null) */
export function toDtoValue(f: Field): string {
  return f.optional && isStringLike(f) ? `v.${f.name} || null` : `v.${f.name}`
}

export function formFieldJsx(f: Field, entityConst: string): string {
  const req = f.optional ? '' : ' required'
  const base = `control={control} name="${f.name}" label="${f.label}"`
  switch (f.type) {
    case 'text':
      return `<FieldTextarea ${base}${req} className="sm:col-span-2" />`
    case 'int':
      return `<FieldNumber ${base}${req} step={1} />`
    case 'number':
      return `<FieldNumber ${base}${req} step={0.01} />`
    case 'boolean':
      return `<FieldCheckbox control={control} name="${f.name}" label="${f.label}" className="sm:col-span-2" />`
    case 'date':
      return `<FieldText ${base} type="date"${req} />`
    case 'enum':
      return `<FieldSelect ${base}${req} options={${f.optional ? `[{ value: '', label: 'Sin especificar' }, ...${enumOptions(entityConst, f)}]` : enumOptions(entityConst, f)}} />`
    case 'ref':
      return `<FieldSelect ${base}${req} options={${f.optional ? `[{ value: null, label: 'Sin especificar' }, ...${refOptionsVar(f)}]` : refOptionsVar(f)}} />`
    case 'many':
      return `<FieldCheckboxGroup control={control} name="${f.name}" label="${f.label}" options={${refOptionsVar(f)}} searchable className="sm:col-span-2" />`
    default:
      return `<FieldText ${base}${req} />`
  }
}

// ─── Tipos TS ─────────────────────────────────────────────────────────────────
export function tsType(f: Field, entityConst: string): string {
  let t: string
  switch (f.type) {
    case 'int':
    case 'number':
    case 'ref':
      t = 'number'
      break
    case 'boolean':
      return 'boolean'
    case 'many':
      return 'number[]'
    case 'enum':
      t = `(typeof ${enumConst(entityConst, f)})[number]`
      break
    default:
      t = 'string'
  }
  return f.optional ? `${t} | null` : t
}

// ─── Columna de la tabla ──────────────────────────────────────────────────────
export function tableColumn(f: Field, entityConst: string, isDisplay: boolean): string {
  const opts: string[] = [`header: '${f.label}'`]
  if (!isSortable(f)) opts.push('enableSorting: false')
  if (!isSearchable(f)) opts.push('enableGlobalFilter: false')

  switch (f.type) {
    case 'string':
      if (isDisplay) {
        opts.push(`cell: ({ row: { original: item } }) => (
          <Link {...editLinkProps(item)} className="font-medium text-ink-1 transition-colors hover:text-accent">
            {item.${f.name}}
          </Link>
        )`)
      } else if (f.optional) {
        opts.push(`cell: ({ getValue }) => getValue() || <span className="italic text-ink-4">—</span>`)
      }
      break
    case 'text':
      opts.push(`meta: { className: 'max-w-xs truncate text-ink-3' }`)
      opts.push(`cell: ({ getValue }) => getValue() || <span className="italic text-ink-4">—</span>`)
      break
    case 'int':
    case 'number':
      opts.push(`meta: { align: 'right' }`)
      opts.push(`cell: ({ getValue }) => { const v = getValue(); return v === null ? '—' : v.toLocaleString('es') }`)
      break
    case 'boolean':
      opts.push(`cell: ({ getValue }) => <YesNoBadge value={getValue()} />`)
      break
    case 'date':
      opts.push(`cell: ({ getValue }) => formatDate(getValue())`)
      break
    case 'enum':
      opts.push(
        `cell: ({ getValue }) => { const v = getValue(); return v ? <span className="inline-flex rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 text-xs text-accent">{labelOf(${enumOptions(entityConst, f)}, v)}</span> : '—' }`,
      )
      break
    case 'ref':
      // Se muestra la etiqueta del registro relacionado; el id de la columna = clave de orden de la API
      opts.push(`id: '${f.name}'`)
      opts.push(`cell: ({ getValue }) => getValue() ?? <span className="italic text-ink-4">—</span>`)
      return `col.accessor(r => r.${relName(f)}?.label ?? null, { ${opts.join(', ')} })`
    case 'many':
      opts.push(`id: '${f.name}'`)
      opts.push(`cell: ({ getValue }) => <RefBadges items={getValue()} />`)
      return `col.accessor(r => r.${relName(f)}, { ${opts.join(', ')} })`
  }
  return `col.accessor('${f.name}', { ${opts.join(', ')} })`
}

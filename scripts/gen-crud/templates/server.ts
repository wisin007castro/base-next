import {
  drizzleColumn,
  enumConst,
  enumOptions,
  isFilterable,
  isSearchable,
  isSortable,
  refAlias,
  relName,
  tsType,
  zodServer,
  type Field,
} from '../fields'
import { humanize } from '../names'
import { columnFields, formFields, manyFields, ownerOf, pivotOf, refFields, type Ctx } from './context'

const hasEnums = (c: Ctx) => c.fields.some(f => f.type === 'enum')
const enumValuesList = (c: Ctx) => c.fields.filter(f => f.type === 'enum').map(f => enumConst(c.n.CONST, f))
const refLabelKey = (f: Field) => `${relName(f)}_label`
const refDeletedKey = (f: Field) => `${relName(f)}_deleted_at`
const notFoundMsg = (c: Ctx) =>
  `${c.n.labelSingular.charAt(0).toUpperCase() + c.n.labelSingular.slice(1)} no encontrad${c.n.fem ? 'a' : 'o'}`
/** Refs obligatorios a destinos con soft delete: si el padre se elimina, el hijo se oculta */
const requiredSoftRefs = (c: Ctx) => refFields(c).filter(f => !f.optional && f.ref!.softDelete)
/** Refs opcionales a destinos con soft delete: el hijo se ve, pero la relación sale como eliminada */
const optionalSoftRefs = (c: Ctx) => refFields(c).filter(f => f.optional && f.ref!.softDelete)
const json422 = `NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })`

// ─── lib/constants/<plural>.ts (solo si hay enums) ────────────────────────────
export const constantsFile = (c: Ctx) => `/** Valores de los enums de ${c.n.label} (compartido por DB, API y UI) */
${c.fields
  .filter(f => f.type === 'enum')
  .map(
    f => `export const ${enumConst(c.n.CONST, f)} = [${f.values.map(v => `'${v}'`).join(', ')}] as const

export const ${enumOptions(c.n.CONST, f)} = [
${f.values.map(v => `  { value: '${v}', label: '${humanize(v)}' },`).join('\n')}
] as const satisfies readonly { value: (typeof ${enumConst(c.n.CONST, f)})[number]; label: string }[]`,
  )
  .join('\n\n')}
`

// ─── Tabla Drizzle + intermedias (se insertan en lib/db/schema/index.ts) ──────
export const drizzleTable = (c: Ctx) => {
  const t = c.n.camelPlural
  const uniques = c.fields.filter(f => f.unique)
  const indexes = [
    // Con soft delete, únicos solo entre activos: un registro eliminado no bloquea su valor
    ...uniques.map(f =>
      c.softDelete
        ? `uniqueIndex('${c.n.snakePlural}_${f.name}_unique').on(t.${f.camel}).where(sql\`\${t.deletedAt} is null\`)`
        : `uniqueIndex('${c.n.snakePlural}_${f.name}_unique').on(t.${f.camel})`,
    ),
    ...refFields(c).map(f => `index('${c.n.snakePlural}_${f.name}_idx').on(t.${f.camel})`),
  ]
  const pivots = manyFields(c).map(f => {
    const p = pivotOf(c, f)
    return `
/** ${c.n.label} ↔ ${f.label} (N:M) */
export const ${p.table} = sqliteTable(
  '${p.sql}',
  {
    ${p.parentFkCamel}: integer('${p.parentFk}').notNull().references(() => ${t}.id, { onDelete: 'cascade' }),
    ${p.targetFkCamel}: integer('${p.targetFk}').notNull().references(() => ${f.ref!.table}.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.${p.parentFkCamel}, t.${p.targetFkCamel}] }), index('${p.sql}_${p.targetFk}_idx').on(t.${p.targetFkCamel})],
)
`
  })

  return `// -------------------------------------------------------------------
// ${c.n.snakePlural}
// -------------------------------------------------------------------
export const ${t} = sqliteTable(
  '${c.n.snakePlural}',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
${columnFields(c)
  .map(f => `    ${f.camel}: ${drizzleColumn(f, c.n.CONST)},`)
  .join('\n')}
    createdAt: text('created_at').notNull().default(ts()),
    updatedAt: text('updated_at').notNull().default(ts()),${c.softDelete ? "\n    deletedAt: text('deleted_at')," : ''}
  },${indexes.length ? `\n  t => [\n${indexes.map(i => `    ${i},`).join('\n')}\n  ],` : ''}
)
${pivots.join('')}`
}

export const drizzleEnumImport = (c: Ctx) =>
  hasEnums(c) ? `import { ${enumValuesList(c).join(', ')} } from '../../constants/${c.n.kebabPlural}'\n` : ''

// ─── lib/types/<entity>.types.ts ──────────────────────────────────────────────
export const typesFile = (
  c: Ctx,
) => `${hasEnums(c) ? `import type { ${enumValuesList(c).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n\n` : ''}/** Registro relacionado tal como lo incluye la API */
export interface RefLabel {
  id: number
  label: string
}

/** ${c.n.labelSingular} tal como lo devuelve la API */
export interface ${c.n.Pascal} {
  id: number
${c.fields.map(f => `  ${f.name}: ${tsType(f, c.n.CONST)}`).join('\n')}
${refFields(c)
  .map(f => `  /** ${f.label} (incluido por la API) */\n  ${relName(f)}: RefLabel${f.optional ? ' | null' : ''}`)
  .join('\n')}
${manyFields(c)
  .map(f => `  /** ${f.label} (incluidos por la API) */\n  ${relName(f)}: RefLabel[]`)
  .join('\n')}
  created_at: string
  updated_at: string${c.softDelete ? '\n  /** Fecha de eliminación (soft delete), o null si está activo */\n  deleted_at: string | null' : ''}
}

/** Filtros del listado (query string de GET /api/${c.n.kebabPlural}) */
export interface ${c.n.Pascal}Filters {
  page?: number
  per_page?: number
  /** \`campo\` asc, \`-campo\` desc */
  sort?: string
  search?: string${c.softDelete ? '\n  with_trashed?: boolean' : ''}
${c.fields
  .filter(isFilterable)
  .map(f => `  ${f.name}?: ${f.type === 'ref' || f.type === 'many' ? 'number' : 'string'}`)
  .join('\n')}
}
`

// ─── lib/api/schemas/<entity>.schema.ts ───────────────────────────────────────
export const schemaFile = (c: Ctx) => {
  const fields = formFields(c)
  const needsDate = fields.some(f => f.type === 'date')
  const actions = c.softDelete ? `['delete', 'restore', 'force_delete']` : `['delete']`
  return `import { z${needsDate ? ', DATE_RE' : ''} } from '@/lib/validation/zod-config'
${hasEnums(c) ? `import { ${enumValuesList(c).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}
export const create${c.n.Pascal}Schema = z.object({
${fields.map(f => `  ${f.name}: ${zodServer(f, c.n.CONST)},`).join('\n')}
})

export const update${c.n.Pascal}Schema = create${c.n.Pascal}Schema.partial()

export const BULK_${c.n.CONST}_ACTIONS = ${actions} as const

export const bulk${c.n.PascalPlural}Schema = z.object({
  action: z.enum(BULK_${c.n.CONST}_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un registro').max(100),
})

export type Create${c.n.Pascal}Input = z.infer<typeof create${c.n.Pascal}Schema>
export type Update${c.n.Pascal}Input = z.infer<typeof update${c.n.Pascal}Schema>
export type Bulk${c.n.Pascal}Action = (typeof BULK_${c.n.CONST}_ACTIONS)[number]
`
}

// ─── lib/api/serializers/<entity>.serializer.ts (consultas + serialización) ──
export const serializerFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const P = c.n.Pascal
  const refs = refFields(c)
  const manys = manyFields(c)
  const labelled = refs.filter(f => f.ref!.displayCamel)
  const reqSoft = requiredSoftRefs(c)
  const optSoft = optionalSoftRefs(c)
  const tables = [
    ...new Set([t, ...refs.map(f => f.ref!.table), ...manys.flatMap(f => [f.ref!.table, pivotOf(c, f).table])]),
  ]
  const ops = ['and', 'eq']
  if (reqSoft.length) ops.push('exists', 'isNull', 'sql')
  if (c.softDelete) ops.push('isNull')
  if (manys.length) ops.push('asc', 'inArray')
  if (manys.some(f => !f.ref!.displayCamel)) ops.push('sql')
  if (manys.some(f => f.ref!.softDelete) || formFields(c).some(f => f.type === 'ref' && f.ref!.softDelete))
    ops.push('isNull')
  ops.push('type SQL')
  const opsList = [...new Set(ops)].sort((a, b) => a.replace('type ', '~').localeCompare(b.replace('type ', '~')))
  const validated = formFields(c).filter(f => f.type === 'ref' || f.type === 'many')

  const labelOf = (f: Field) => {
    const label = f.ref!.displayCamel ? `s.${refLabelKey(f)} ?? \`#\${r.${f.camel}}\`` : `\`#\${r.${f.camel}}\``
    // Opcional a un destino eliminado: se mantiene el vínculo pero se marca
    return optSoft.includes(f) ? `s.${refDeletedKey(f)} ? \`\${${label}} (eliminado)\` : ${label}` : label
  }

  return `import { ${opsList.join(', ')} } from 'drizzle-orm'
${refs.length ? "import { alias } from 'drizzle-orm/sqlite-core'\n" : ''}import { db } from '@/lib/db'
import { ${tables.join(', ')} } from '@/lib/db/schema'
${manys.length ? "import type { Tx } from '@/lib/api/dependents'\n" : ''}import type { ${P}${manys.length ? ', RefLabel' : ''} } from '@/lib/types/${c.n.kebab}.types'
import type { Update${P}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'
${refs.map(f => `\nconst ${refAlias(f)} = alias(${f.ref!.table}, '${relName(f)}_ref')`).join('')}

/** Columnas de cada relación por las que se puede ordenar el listado */
export const ${c.n.camel}RefSortColumns = {
${labelled.map(f => `  ${f.name}: ${refAlias(f)}.${f.ref!.displayCamel},`).join('\n')}
}

/** No eliminado (soft delete)${c.softDelete ? '' : ': este módulo no tiene soft delete'} */
export const ${c.n.camel}Active: SQL | undefined = ${c.softDelete ? `isNull(${t}.deletedAt)` : 'undefined'}

/**
 * Visibles: sin padres obligatorios eliminados (si se elimina la categoría, sus hijos se ocultan).
 * Con EXISTS en vez de join para poder usarlo también en el COUNT del listado.
 */
export const ${c.n.camel}VisibleParents: SQL[] = [
${reqSoft
  .map(
    f =>
      `  exists(db.select({ one: sql\`1\` }).from(${f.ref!.table}).where(and(eq(${f.ref!.table}.id, ${t}.${f.camel}), isNull(${f.ref!.table}.deletedAt)))),`,
  )
  .join('\n')}
]

/** SELECT base: la fila + la etiqueta de cada relación (listado, detalle y tras crear/editar) */
export const select${c.n.PascalPlural} = () =>
  db
    .select({
      row: ${t},
${labelled.map(f => `      ${refLabelKey(f)}: ${refAlias(f)}.${f.ref!.displayCamel},`).join('\n')}
${optSoft.map(f => `      ${refDeletedKey(f)}: ${refAlias(f)}.deletedAt,`).join('\n')}
    })
    .from(${t})${refs.map(f => `\n    .leftJoin(${refAlias(f)}, eq(${t}.${f.camel}, ${refAlias(f)}.id))`).join('')}

type Selected = {
  row: typeof ${t}.$inferSelect
${labelled.map(f => `  ${refLabelKey(f)}: string | null`).join('\n')}
${optSoft.map(f => `  ${refDeletedKey(f)}: string | null`).join('\n')}
}

/** Un registro visible con sus relaciones, o undefined${c.softDelete ? ' (`withTrashed` incluye eliminados)' : ''} */
export async function find${P}(id: number${c.softDelete ? ', { withTrashed = false } = {}' : ''}) {
  const [item] = await select${c.n.PascalPlural}().where(
    and(eq(${t}.id, id)${c.softDelete ? `, withTrashed ? undefined : ${c.n.camel}Active` : ''}, ...${c.n.camel}VisibleParents),
  )
  return item
}
${
  manys.length
    ? `
/** Relaciones N:M de varias filas en una consulta por campo (sin N+1) */
async function loadMany(ids: number[]) {
${manys
  .map(f => {
    const p = pivotOf(c, f)
    const target = f.ref!.table
    const label = f.ref!.displayCamel ? `${target}.${f.ref!.displayCamel}` : `sql<string>\`'#' || \${${target}.id}\``
    return `  const ${f.camel} = new Map<number, RefLabel[]>()
  if (ids.length) {
    const rows = await db
      .select({ parentId: ${p.table}.${p.parentFkCamel}, id: ${target}.id, label: ${label} })
      .from(${p.table})
      .innerJoin(${target}, eq(${p.table}.${p.targetFkCamel}, ${target}.id))
      .where(and(inArray(${p.table}.${p.parentFkCamel}, ids)${f.ref!.softDelete ? `, isNull(${target}.deletedAt)` : ''}))
      .orderBy(asc(${label}))
    for (const { parentId, ...ref } of rows) ${f.camel}.set(parentId, [...(${f.camel}.get(parentId) ?? []), ref])
  }`
  })
  .join('\n')}
  return { ${manys.map(f => f.camel).join(', ')} }
}

type ManyMaps = Awaited<ReturnType<typeof loadMany>>
`
    : ''
}
/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
function serializeOne(s: Selected${manys.length ? ', many: ManyMaps' : ''}): ${P} {
  const r = s.row
  return {
    id: r.id,
${columnFields(c)
  .map(f => `    ${f.name}: r.${f.camel},`)
  .join('\n')}
${manys.map(f => `    ${f.name}: (many.${f.camel}.get(r.id) ?? []).map(e => e.id),`).join('\n')}
${refs
  .map(f => {
    const obj = `{ id: r.${f.camel}, label: ${labelOf(f)} }`
    return `    ${relName(f)}: ${f.optional ? `r.${f.camel} === null ? null : ${obj}` : obj},`
  })
  .join('\n')}
${manys.map(f => `    ${relName(f)}: many.${f.camel}.get(r.id) ?? [],`).join('\n')}
    created_at: r.createdAt,
    updated_at: r.updatedAt,${c.softDelete ? '\n    deleted_at: r.deletedAt,' : ''}
  }
}

/** Serializa filas${manys.length ? ' (carga las relaciones N:M en una consulta por campo)' : ''} */
export async function serialize${c.n.PascalPlural}(rows: Selected[]): Promise<${P}[]> {
${manys.length ? `  const many = await loadMany(rows.map(r => r.row.id))\n  return rows.map(r => serializeOne(r, many))` : '  return rows.map(r => serializeOne(r))'}
}

export const serialize${P} = async (row: Selected) => (await serialize${c.n.PascalPlural}([row]))[0]

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function to${P}Row(input: Update${P}Input): Partial<typeof ${t}.$inferInsert> {
  const row: Partial<typeof ${t}.$inferInsert> = {}
${formFields(c)
  .filter(f => f.type !== 'many')
  .map(f => `  if (input.${f.name} !== undefined) row.${f.camel} = input.${f.name}`)
  .join('\n')}
  return row
}
${
  manys.length
    ? `
/** Reemplaza las relaciones N:M presentes en el body (dentro de la transacción del create/update) */
export function sync${P}Many(tx: Tx, id: number, input: Update${P}Input) {
${manys
  .map(f => {
    const p = pivotOf(c, f)
    return `  if (input.${f.name} !== undefined) {
    tx.delete(${p.table}).where(eq(${p.table}.${p.parentFkCamel}, id)).run()
    const ids = [...new Set(input.${f.name})]
    if (ids.length) tx.insert(${p.table}).values(ids.map(${p.targetFkCamel} => ({ ${p.parentFkCamel}: id, ${p.targetFkCamel} }))).run()
  }`
  })
  .join('\n')}
}
`
    : ''
}${
    validated.length
      ? `
/** Comprueba que existan${validated.some(f => f.ref!.softDelete) ? ' (y no estén eliminados)' : ''} los registros referenciados → errores por campo (422) */
export async function validate${P}Refs(input: Update${P}Input) {
  const errors: Record<string, string[]> = {}
${validated
  .map(f => {
    const target = f.ref!.table
    const alive = f.ref!.softDelete ? `, isNull(${target}.deletedAt)` : ''
    if (f.type === 'ref') {
      return `  if (input.${f.name} != null) {
    const [found] = await db.select({ id: ${target}.id }).from(${target}).where(and(eq(${target}.id, input.${f.name})${alive}))
    if (!found) errors.${f.name} = ['El registro seleccionado no existe']
  }`
    }
    return `  if (input.${f.name}?.length) {
    const ids = [...new Set(input.${f.name})]
    const found = await db.select({ id: ${target}.id }).from(${target}).where(and(inArray(${target}.id, ids)${alive}))
    if (found.length !== ids.length) errors.${f.name} = ['Alguno de los registros seleccionados no existe']
  }`
  })
  .join('\n')}
  return errors
}
`
      : ''
  }`
}

const refValidation = (c: Ctx) =>
  formFields(c).some(f => f.type === 'ref' || f.type === 'many')
    ? `
  const refErrors = await validate${c.n.Pascal}Refs(parsed.data)
  if (Object.keys(refErrors).length) {
    return NextResponse.json({ message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: refErrors } }, { status: 422 })
  }
`
    : ''

const hasValidation = (c: Ctx) => formFields(c).some(f => f.type === 'ref' || f.type === 'many')

// ─── app/api/<plural>/route.ts ────────────────────────────────────────────────
export const listRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const P = c.n.Pascal
  const searchable = c.fields.filter(isSearchable)
  const filterable = c.fields.filter(isFilterable)
  const ops = ['and', 'count', 'desc', 'type SQL']
  if (filterable.some(f => f.type !== 'many')) ops.push('eq')
  if (filterable.some(f => f.type === 'many')) ops.push('eq', 'inArray')
  if (searchable.length) ops.push('like', 'or')
  const enumFilters = filterable.filter(f => f.type === 'enum')
  const owner = ownerOf(c)
  const manys = manyFields(c)
  const serializerImports = [
    `find${P}`,
    ...(c.softDelete ? [`${c.n.camel}Active`] : []),
    `${c.n.camel}RefSortColumns`,
    `${c.n.camel}VisibleParents`,
    `select${c.n.PascalPlural}`,
    `serialize${P}`,
    `serialize${c.n.PascalPlural}`,
    `to${P}Row`,
    ...(manys.length ? [`sync${P}Many`] : []),
    ...(hasValidation(c) ? [`validate${P}Refs`] : []),
  ]
  const opsList = [...new Set(ops)].sort((a, b) => a.replace('type ', '~').localeCompare(b.replace('type ', '~')))
  const pivotTables = manys.filter(f => filterable.includes(f)).map(f => pivotOf(c, f).table)

  return `import { NextRequest, NextResponse } from 'next/server'
import { ${opsList.join(', ')} } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${[t, ...pivotTables].join(', ')} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { create${P}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { ${serializerImports.join(', ')} } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
${enumFilters.length ? `import { ${enumFilters.map(f => enumConst(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}
/** Columnas por las que se puede ordenar: \`?sort=campo\` / \`?sort=-campo\` */
const SORTABLE = {
  id: ${t}.id,
  created_at: ${t}.createdAt,
${columnFields(c)
  .filter(f => isSortable(f) && f.type !== 'ref')
  .map(f => `  ${f.name}: ${t}.${f.camel},`)
  .join('\n')}
  // Relaciones: se ordena por la etiqueta del registro relacionado
  ...${c.n.camel}RefSortColumns,
}

// GET /api/${c.n.kebabPlural}
export async function GET(req: NextRequest) {
  const guard = await requirePermission('${c.n.snakePlural}.view')
  if (isGuardError(guard)) return guard

  const { searchParams } = req.nextUrl
  const pagination = parsePagination(searchParams)
${
  c.softDelete
    ? `  // \`?with_trashed=true\` incluye los eliminados (y los hijos de padres eliminados)
  const withTrashed = searchParams.get('with_trashed') === 'true'
  const conditions: (SQL | undefined)[] = withTrashed ? [] : [${c.n.camel}Active, ...${c.n.camel}VisibleParents]
`
    : `  const conditions: (SQL | undefined)[] = [...${c.n.camel}VisibleParents]
`
}${
    searchable.length
      ? `
  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = \`%\${search}%\`
    conditions.push(or(${searchable.map(f => `like(${t}.${f.camel}, term)`).join(', ')}))
  }
`
      : ''
  }${filterable
    .map(f => {
      if (f.type === 'boolean') {
        return `
  const ${f.camel} = searchParams.get('${f.name}')
  if (${f.camel} === 'true' || ${f.camel} === 'false') conditions.push(eq(${t}.${f.camel}, ${f.camel} === 'true'))
`
      }
      if (f.type === 'ref') {
        return `
  const ${f.camel} = Number(searchParams.get('${f.name}'))
  if (Number.isInteger(${f.camel}) && ${f.camel} > 0) conditions.push(eq(${t}.${f.camel}, ${f.camel}))
`
      }
      if (f.type === 'many') {
        const p = pivotOf(c, f)
        return `
  // Tiene la relación indicada: \`?${f.name}=3\`
  const ${f.camel} = Number(searchParams.get('${f.name}'))
  if (Number.isInteger(${f.camel}) && ${f.camel} > 0) {
    conditions.push(
      inArray(
        ${t}.id,
        db.select({ id: ${p.table}.${p.parentFkCamel} }).from(${p.table}).where(eq(${p.table}.${p.targetFkCamel}, ${f.camel})),
      ),
    )
  }
`
      }
      return `
  const ${f.camel} = searchParams.get('${f.name}')
  const ${f.camel}Value = ${enumConst(c.n.CONST, f)}.find(v => v === ${f.camel})
  if (${f.camel}Value) conditions.push(eq(${t}.${f.camel}, ${f.camel}Value))
`
    })
    .join('')}
  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    select${c.n.PascalPlural}()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(${t}.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(${t}).where(where),
  ])

  return NextResponse.json(paginated(await serialize${c.n.PascalPlural}(rows), total, pagination))
}

// POST /api/${c.n.kebabPlural}
export async function POST(req: NextRequest) {
  const guard = await requirePermission('${c.n.snakePlural}.create')
  if (isGuardError(guard)) return guard

  const parsed = create${P}Schema.safeParse(await req.json())
  if (!parsed.success) return ${json422}
${refValidation(c)}
  try {
    // create${P}Schema garantiza los campos obligatorios
    const values = {
      ...to${P}Row(parsed.data),${owner ? `\n      // El autor es siempre quien crea el registro (no viene del body)\n      ${owner.camel}: Number(guard.user.id),` : ''}
    } as typeof ${t}.$inferInsert
    // Fila + relaciones N:M en una transacción: o se guarda todo o nada
    const id = db.transaction(tx => {
      const [{ id }] = tx.insert(${t}).values(values).returning({ id: ${t}.id }).all()${manys.length ? `\n      sync${P}Many(tx, id, parsed.data)` : ''}
      return id
    })
    return NextResponse.json(await serialize${P}((await find${P}(id))!), { status: 201 })
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}
`
}

// ─── app/api/<plural>/[id]/route.ts ───────────────────────────────────────────
export const itemRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const P = c.n.Pascal
  const manys = manyFields(c)
  const ops = ['and', 'eq', ...(c.softDelete ? ['isNull'] : [])]
  const serializerImports = [
    `find${P}`,
    `serialize${P}`,
    `to${P}Row`,
    ...(manys.length ? [`sync${P}Many`] : []),
    ...(hasValidation(c) ? [`validate${P}Refs`] : []),
  ]

  const deleteBody = c.softDelete
    ? `  // Soft delete: comprueba dependientes (restrict) y propaga a los de política cascade
  const result = db.transaction(tx => {
    const [row] = tx.select({ id: ${t}.id }).from(${t}).where(and(eq(${t}.id, id), isNull(${t}.deletedAt))).all()
    if (!row) return { status: 404 as const }
    const blocked = restrictMessage(tx, '${c.n.snakePlural}', [id])
    if (blocked) return { status: 409 as const, message: blocked }
    const now = new Date().toISOString()
    tx.update(${t}).set({ deletedAt: now, updatedAt: now }).where(eq(${t}.id, id)).run()
    cascadeSoftDelete(tx, '${c.n.snakePlural}', [id], now)
    return { status: 204 as const }
  })
  if (result.status === 404) return notFound()
  if (result.status === 409) return NextResponse.json({ message: result.message }, { status: 409 })
  return new NextResponse(null, { status: 204 })`
    : `  try {
    const deleted = await db.delete(${t}).where(eq(${t}.id, id)).returning({ id: ${t}.id })
    if (!deleted.length) return notFound()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }`

  return `import { NextRequest, NextResponse } from 'next/server'
import { ${ops.join(', ')} } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { update${P}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { ${serializerImports.join(', ')} } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { ${c.softDelete ? 'uniqueViolationResponse' : 'foreignKeyViolationResponse, uniqueViolationResponse'} } from '@/lib/api/db-errors'
${c.softDelete ? "import { cascadeSoftDelete, restrictMessage } from '@/lib/api/dependents'\n" : ''}
type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: '${notFoundMsg(c)}' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/${c.n.kebabPlural}/:id${c.softDelete ? '  (?with_trashed=true incluye eliminados)' : ''}
export async function GET(${c.softDelete ? 'req' : '_req'}: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id ? await find${P}(id${c.softDelete ? ", { withTrashed: req.nextUrl.searchParams.get('with_trashed') === 'true' }" : ''}) : undefined
  if (!item) return notFound()
  return NextResponse.json(await serialize${P}(item))
}

// PATCH /api/${c.n.kebabPlural}/:id${c.softDelete ? '  (no se editan eliminados: restaurar primero)' : ''}
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = update${P}Schema.safeParse(await req.json())
  if (!parsed.success) return ${json422}
${refValidation(c)}
  try {
    const updated = db.transaction(tx => {
      const rows = tx
        .update(${t})
        .set({ ...to${P}Row(parsed.data), updatedAt: new Date().toISOString() })
        .where(and(eq(${t}.id, id)${c.softDelete ? `, isNull(${t}.deletedAt)` : ''}))
        .returning({ id: ${t}.id })
        .all()${manys.length ? `\n      if (rows.length) sync${P}Many(tx, id, parsed.data)` : ''}
      return rows.length > 0
    })
    if (!updated) return notFound()
    return NextResponse.json(await serialize${P}((await find${P}(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/${c.n.kebabPlural}/:id${c.softDelete ? '  → soft delete (POST /restore lo deshace, DELETE /force lo borra)' : ''}
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

${deleteBody}
}
`
}

// ─── app/api/<plural>/[id]/restore/route.ts (solo soft delete) ────────────────
export const restoreRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const P = c.n.Pascal
  return `import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { find${P}, serialize${P}, ${c.n.camel}VisibleParents } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeRestore } from '@/lib/api/dependents'

// POST /api/${c.n.kebabPlural}/:id/restore → deshace el soft delete (y el de sus hijos en cascada)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('${c.n.snakePlural}.delete')
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  const [row] = Number.isInteger(id)
    ? await db.select({ id: ${t}.id, deletedAt: ${t}.deletedAt }).from(${t}).where(and(eq(${t}.id, id), isNotNull(${t}.deletedAt)))
    : []
  if (!row) return NextResponse.json({ message: '${notFoundMsg(c)} entre los eliminados' }, { status: 404 })

  // Un padre obligatorio eliminado: restaurarlo primero (si no, el registro seguiría oculto)
  const [visible] = await db.select({ id: ${t}.id }).from(${t}).where(and(eq(${t}.id, id), ...${c.n.camel}VisibleParents))
  if (!visible) {
    return NextResponse.json({ message: 'Restaura primero el registro relacionado del que depende' }, { status: 422 })
  }

  try {
    db.transaction(tx => {
      tx.update(${t}).set({ deletedAt: null, updatedAt: new Date().toISOString() }).where(eq(${t}.id, id)).run()
      cascadeRestore(tx, '${c.n.snakePlural}', [id], row.deletedAt!)
    })
  } catch (err) {
    // Otro registro activo tomó su valor único mientras estaba eliminado
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
  return NextResponse.json(await serialize${P}((await find${P}(id))!))
}
`
}

// ─── app/api/<plural>/[id]/force/route.ts (solo soft delete) ──────────────────
export const forceRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  return `import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// DELETE /api/${c.n.kebabPlural}/:id/force → borrado definitivo, solo de eliminados (dos pasos).
// Las FK aplican su política: cascade borra hijos, restrict lo impide (409), set null los desvincula.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('${c.n.snakePlural}.force_delete')
  if (isGuardError(guard)) return guard

  const id = Number((await params).id)
  try {
    const deleted = Number.isInteger(id)
      ? await db.delete(${t}).where(and(eq(${t}.id, id), isNotNull(${t}.deletedAt))).returning({ id: ${t}.id })
      : []
    if (!deleted.length) {
      return NextResponse.json({ message: 'Elimina primero el registro; luego podrás borrarlo definitivamente' }, { status: 409 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}
`
}

// ─── app/api/<plural>/bulk/route.ts ───────────────────────────────────────────
export const bulkRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  if (!c.softDelete) {
    return `import { NextRequest, NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { bulk${c.n.PascalPlural}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// POST /api/${c.n.kebabPlural}/bulk  { action: 'delete', ids }
export async function POST(req: NextRequest) {
  const guard = await requirePermission('${c.n.snakePlural}.delete')
  if (isGuardError(guard)) return guard

  const parsed = bulk${c.n.PascalPlural}Schema.safeParse(await req.json())
  if (!parsed.success) return ${json422}

  try {
    const result = await db.delete(${t}).where(inArray(${t}.id, parsed.data.ids))
    return NextResponse.json({ affected: result.changes, skipped: [] })
  } catch (err) {
    // Todo o nada: si alguno tiene dependientes, no se borra ninguno
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
}
`
  }
  return `import { NextRequest, NextResponse } from 'next/server'
import { and, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { bulk${c.n.PascalPlural}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { ${c.n.camel}VisibleParents } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'
import { cascadeRestore, cascadeSoftDelete, restrictMessage } from '@/lib/api/dependents'

// POST /api/${c.n.kebabPlural}/bulk  { action: 'delete' | 'restore' | 'force_delete', ids }
// Cada acción es todo o nada (transacción)
export async function POST(req: NextRequest) {
  const parsed = bulk${c.n.PascalPlural}Schema.safeParse(await req.json())
  if (!parsed.success) return ${json422}

  const { action } = parsed.data
  const guard = await requirePermission(action === 'force_delete' ? '${c.n.snakePlural}.force_delete' : '${c.n.snakePlural}.delete')
  if (isGuardError(guard)) return guard

  const ids = [...new Set(parsed.data.ids)]

  try {
    if (action === 'force_delete') {
      const result = await db.delete(${t}).where(and(inArray(${t}.id, ids), isNotNull(${t}.deletedAt)))
      return NextResponse.json({ affected: result.changes, skipped: [] })
    }

    if (action === 'delete') {
      const result = db.transaction(tx => {
        const active = tx
          .select({ id: ${t}.id })
          .from(${t})
          .where(and(inArray(${t}.id, ids), isNull(${t}.deletedAt)))
          .all()
          .map(r => r.id)
        const blocked = active.length ? restrictMessage(tx, '${c.n.snakePlural}', active) : null
        if (blocked) return { blocked }
        const now = new Date().toISOString()
        if (active.length) {
          tx.update(${t}).set({ deletedAt: now, updatedAt: now }).where(inArray(${t}.id, active)).run()
          cascadeSoftDelete(tx, '${c.n.snakePlural}', active, now)
        }
        return { affected: active.length }
      })
      if ('blocked' in result) return NextResponse.json({ message: result.blocked }, { status: 409 })
      return NextResponse.json({ affected: result.affected, skipped: [] })
    }

    // restore: solo eliminados cuyos padres obligatorios estén activos
    const deleted = await db
      .select({ id: ${t}.id, deletedAt: ${t}.deletedAt })
      .from(${t})
      .where(and(inArray(${t}.id, ids), isNotNull(${t}.deletedAt)))
    const restorable = new Set(
      deleted.length
        ? (
            await db
              .select({ id: ${t}.id })
              .from(${t})
              .where(and(inArray(${t}.id, deleted.map(r => r.id)), ...${c.n.camel}VisibleParents))
          ).map(r => r.id)
        : [],
    )
    const skipped = deleted.filter(r => !restorable.has(r.id)).map(r => r.id)
    db.transaction(tx => {
      for (const row of deleted.filter(r => restorable.has(r.id))) {
        tx.update(${t}).set({ deletedAt: null, updatedAt: new Date().toISOString() }).where(inArray(${t}.id, [row.id])).run()
        cascadeRestore(tx, '${c.n.snakePlural}', [row.id], row.deletedAt!)
      }
    })
    return NextResponse.json({ affected: restorable.size, skipped })
  } catch (err) {
    const res = foreignKeyViolationResponse(err) ?? uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}
`
}

// ─── app/api/<plural>/options/route.ts ────────────────────────────────────────
export const optionsRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const d = c.display
  return `import { NextResponse } from 'next/server'
import { and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requireAnyPermission, isGuardError } from '@/lib/api/api-guard'
import { optionsPermissions } from '@/lib/auth/module-permissions'
import { ${c.n.camel}Active, ${c.n.camel}VisibleParents } from '@/lib/api/serializers/${c.n.kebab}.serializer'

// GET /api/${c.n.kebabPlural}/options → [{ value, label }] para selects de otros módulos.
// Lo puede leer quien ve el módulo o quien crea/edita un módulo que lo referencia.
export async function GET() {
  const guard = await requireAnyPermission(optionsPermissions('${c.n.snakePlural}'))
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: ${t}.id${d ? `, label: ${t}.${d.camel}` : ''} })
    .from(${t})
    .where(and(${c.n.camel}Active, ...${c.n.camel}VisibleParents))
    .orderBy(asc(${d ? `${t}.${d.camel}` : `${t}.id`}))
    .limit(500)

  return NextResponse.json(${d ? 'rows' : 'rows.map(r => ({ value: r.value, label: `#${r.value}` }))'})
}
`
}

// ─── Entradas de registros (se insertan en archivos existentes) ───────────────

/** lib/api/dependents.ts: cómo afecta a este módulo eliminar cada destino de sus ref */
export const dependentsEntries = (c: Ctx) =>
  refFields(c)
    .filter(f => !f.owner)
    .map(
      f => `  {
    parent: '${f.ref!.plural}',
    child: '${c.n.snakePlural}',
    label: '${c.n.label}',
    table: schema.${c.n.camelPlural},
    fk: schema.${c.n.camelPlural}.${f.camel},
    deletedAt: ${c.softDelete ? `schema.${c.n.camelPlural}.deletedAt` : 'null'},
    onDelete: '${f.onDelete}',
  },
`,
    )
    .join('')

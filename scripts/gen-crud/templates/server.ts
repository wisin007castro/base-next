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
import { formFields, ownerOf, refFields, type Ctx } from './context'

const hasEnums = (c: Ctx) => c.fields.some(f => f.type === 'enum')
const enumValuesList = (c: Ctx) => c.fields.filter(f => f.type === 'enum').map(f => enumConst(c.n.CONST, f))
const refLabelKey = (f: Field) => `${relName(f)}_label`
const notFoundMsg = (c: Ctx) =>
  `${c.n.labelSingular.charAt(0).toUpperCase() + c.n.labelSingular.slice(1)} no encontrad${c.n.fem ? 'a' : 'o'}`

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

// ─── Tabla Drizzle (se inserta en lib/db/schema/index.ts) ─────────────────────
export const drizzleTable = (c: Ctx) => `// -------------------------------------------------------------------
// ${c.n.snakePlural}
// -------------------------------------------------------------------
export const ${c.n.camelPlural} = sqliteTable('${c.n.snakePlural}', {
  id: integer('id').primaryKey({ autoIncrement: true }),
${c.fields.map(f => `  ${f.camel}: ${drizzleColumn(f, c.n.CONST)},`).join('\n')}
  createdAt: text('created_at').notNull().default(ts()),
  updatedAt: text('updated_at').notNull().default(ts()),
})
`

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
  created_at: string
  updated_at: string
}

/** Filtros del listado (query string de GET /api/${c.n.kebabPlural}) */
export interface ${c.n.Pascal}Filters {
  page?: number
  per_page?: number
  /** \`campo\` asc, \`-campo\` desc */
  sort?: string
  search?: string
${c.fields
  .filter(isFilterable)
  .map(f => `  ${f.name}?: ${f.type === 'ref' ? 'number' : 'string'}`)
  .join('\n')}
}
`

// ─── lib/api/schemas/<entity>.schema.ts ───────────────────────────────────────
export const schemaFile = (c: Ctx) => {
  const fields = formFields(c)
  const needsDate = fields.some(f => f.type === 'date')
  return `import { z${needsDate ? ', DATE_RE' : ''} } from '@/lib/validation/zod-config'
${hasEnums(c) ? `import { ${enumValuesList(c).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}
export const create${c.n.Pascal}Schema = z.object({
${fields.map(f => `  ${f.name}: ${zodServer(f, c.n.CONST)},`).join('\n')}
})

export const update${c.n.Pascal}Schema = create${c.n.Pascal}Schema.partial()

export const bulk${c.n.PascalPlural}Schema = z.object({
  action: z.enum(['delete']),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un registro').max(100),
})

export type Create${c.n.Pascal}Input = z.infer<typeof create${c.n.Pascal}Schema>
export type Update${c.n.Pascal}Input = z.infer<typeof update${c.n.Pascal}Schema>
`
}

// ─── lib/api/serializers/<entity>.serializer.ts (consultas + serialización) ──
export const serializerFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const refs = refFields(c)
  const tables = [...new Set([t, ...refs.map(f => f.ref!.table)])]
  const labelled = refs.filter(f => f.ref!.displayCamel)

  return `import { eq } from 'drizzle-orm'
${refs.length ? "import { alias } from 'drizzle-orm/sqlite-core'\n" : ''}import { db } from '@/lib/db'
import { ${tables.join(', ')} } from '@/lib/db/schema'
import type { ${c.n.Pascal} } from '@/lib/types/${c.n.kebab}.types'
import type { Update${c.n.Pascal}Input } from '@/lib/api/schemas/${c.n.kebab}.schema'
${refs.map(f => `\nconst ${refAlias(f)} = alias(${f.ref!.table}, '${relName(f)}_ref')`).join('')}

/** Columnas de cada relación por las que se puede ordenar el listado */
export const ${c.n.camel}RefSortColumns = {
${labelled.map(f => `  ${f.name}: ${refAlias(f)}.${f.ref!.displayCamel},`).join('\n')}
}

/** SELECT base: la fila + la etiqueta de cada relación (listado, detalle y tras crear/editar) */
export const select${c.n.PascalPlural} = () =>
  db
    .select({
      row: ${t},
${labelled.map(f => `      ${refLabelKey(f)}: ${refAlias(f)}.${f.ref!.displayCamel},`).join('\n')}
    })
    .from(${t})${refs.map(f => `\n    .leftJoin(${refAlias(f)}, eq(${t}.${f.camel}, ${refAlias(f)}.id))`).join('')}

type Selected = {
  row: typeof ${t}.$inferSelect
${labelled.map(f => `  ${refLabelKey(f)}: string | null`).join('\n')}
}

/** Un registro con sus relaciones, o undefined */
export async function find${c.n.Pascal}(id: number) {
  const [item] = await select${c.n.PascalPlural}().where(eq(${t}.id, id))
  return item
}

/** Fila de la DB (camelCase) → respuesta de la API (snake_case) */
export function serialize${c.n.Pascal}(s: Selected): ${c.n.Pascal} {
  const r = s.row
  return {
    id: r.id,
${c.fields.map(f => `    ${f.name}: r.${f.camel},`).join('\n')}
${refs
  .map(f => {
    const label = f.ref!.displayCamel ? `s.${refLabelKey(f)} ?? \`#\${r.${f.camel}}\`` : `\`#\${r.${f.camel}}\``
    const obj = `{ id: r.${f.camel}, label: ${label} }`
    return `    ${relName(f)}: ${f.optional ? `r.${f.camel} === null ? null : ${obj}` : obj},`
  })
  .join('\n')}
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

/** Body validado de la API → columnas de la DB (solo las presentes: sirve para crear y para PATCH) */
export function to${c.n.Pascal}Row(input: Update${c.n.Pascal}Input): Partial<typeof ${t}.$inferInsert> {
  const row: Partial<typeof ${t}.$inferInsert> = {}
${formFields(c)
  .map(f => `  if (input.${f.name} !== undefined) row.${f.camel} = input.${f.name}`)
  .join('\n')}
  return row
}
${
  formFields(c).some(f => f.type === 'ref')
    ? `
/** Comprueba que existan los registros referenciados → errores por campo (422) */
export async function validate${c.n.Pascal}Refs(input: Update${c.n.Pascal}Input) {
  const errors: Record<string, string[]> = {}
${formFields(c)
  .filter(f => f.type === 'ref')
  .map(
    f => `  if (input.${f.name} != null) {
    const [found] = await db.select({ id: ${f.ref!.table}.id }).from(${f.ref!.table}).where(eq(${f.ref!.table}.id, input.${f.name}))
    if (!found) errors.${f.name} = ['El registro seleccionado no existe']
  }`,
  )
  .join('\n')}
  return errors
}
`
    : ''
}`
}

const refValidation = (c: Ctx) =>
  formFields(c).some(f => f.type === 'ref')
    ? `
  const refErrors = await validate${c.n.Pascal}Refs(parsed.data)
  if (Object.keys(refErrors).length) {
    return NextResponse.json({ message: 'Datos inválidos', errors: { formErrors: [], fieldErrors: refErrors } }, { status: 422 })
  }
`
    : ''

// ─── app/api/<plural>/route.ts ────────────────────────────────────────────────
export const listRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const searchable = c.fields.filter(isSearchable)
  const filterable = c.fields.filter(isFilterable)
  const ops = ['and', 'count', 'desc']
  if (filterable.length) ops.push('eq')
  if (searchable.length) ops.push('like', 'or')
  const enumFilters = filterable.filter(f => f.type === 'enum')
  const owner = ownerOf(c)
  const hasRefValidation = formFields(c).some(f => f.type === 'ref')
  const serializerImports = [
    `find${c.n.Pascal}`,
    `${c.n.camel}RefSortColumns`,
    `select${c.n.PascalPlural}`,
    `serialize${c.n.Pascal}`,
    `to${c.n.Pascal}Row`,
    ...(hasRefValidation ? [`validate${c.n.Pascal}Refs`] : []),
  ]

  return `import { NextRequest, NextResponse } from 'next/server'
import { ${ops.sort().join(', ')}, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { create${c.n.Pascal}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { ${serializerImports.join(', ')} } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { paginated, parsePagination, parseSort } from '@/lib/api/list-params'
import { uniqueViolationResponse } from '@/lib/api/db-errors'
${enumFilters.length ? `import { ${enumFilters.map(f => enumConst(c.n.CONST, f)).join(', ')} } from '@/lib/constants/${c.n.kebabPlural}'\n` : ''}
/** Columnas por las que se puede ordenar: \`?sort=campo\` / \`?sort=-campo\` */
const SORTABLE = {
  id: ${t}.id,
  created_at: ${t}.createdAt,
${c.fields
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
  const conditions: SQL[] = []
${
  searchable.length
    ? `
  const search = searchParams.get('search')?.trim()
  if (search) {
    const term = \`%\${search}%\`
    conditions.push(or(${searchable.map(f => `like(${t}.${f.camel}, term)`).join(', ')})!)
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
      return `
  const ${f.camel} = searchParams.get('${f.name}')
  const ${f.camel}Value = ${enumConst(c.n.CONST, f)}.find(v => v === ${f.camel})
  if (${f.camel}Value) conditions.push(eq(${t}.${f.camel}, ${f.camel}Value))
`
    })
    .join('')}
  const where = conditions.length ? and(...conditions) : undefined
  const [rows, [{ total }]] = await Promise.all([
    select${c.n.PascalPlural}()
      .where(where)
      .orderBy(parseSort(searchParams.get('sort'), SORTABLE, desc(${t}.createdAt)))
      .limit(pagination.perPage)
      .offset(pagination.offset),
    db.select({ total: count() }).from(${t}).where(where),
  ])

  return NextResponse.json(paginated(rows.map(serialize${c.n.Pascal}), total, pagination))
}

// POST /api/${c.n.kebabPlural}
export async function POST(req: NextRequest) {
  const guard = await requirePermission('${c.n.snakePlural}.create')
  if (isGuardError(guard)) return guard

  const parsed = create${c.n.Pascal}Schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
${refValidation(c)}
  try {
    // create${c.n.Pascal}Schema garantiza los campos obligatorios
    const values = {
      ...to${c.n.Pascal}Row(parsed.data),${owner ? `\n      // El autor es siempre quien crea el registro (no viene del body)\n      ${owner.camel}: Number(guard.user.id),` : ''}
    } as typeof ${t}.$inferInsert
    const [{ id }] = await db.insert(${t}).values(values).returning({ id: ${t}.id })
    return NextResponse.json(serialize${c.n.Pascal}((await find${c.n.Pascal}(id))!), { status: 201 })
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
  const hasRefValidation = formFields(c).some(f => f.type === 'ref')
  return `import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'
import { update${c.n.Pascal}Schema } from '@/lib/api/schemas/${c.n.kebab}.schema'
import { find${c.n.Pascal}, serialize${c.n.Pascal}, to${c.n.Pascal}Row${hasRefValidation ? `, validate${c.n.Pascal}Refs` : ''} } from '@/lib/api/serializers/${c.n.kebab}.serializer'
import { foreignKeyViolationResponse, uniqueViolationResponse } from '@/lib/api/db-errors'

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ message: '${notFoundMsg(c)}' }, { status: 404 })

async function parseId(params: Params['params']) {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/${c.n.kebabPlural}/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.view')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  const item = id ? await find${c.n.Pascal}(id) : undefined
  if (!item) return notFound()
  return NextResponse.json(serialize${c.n.Pascal}(item))
}

// PATCH /api/${c.n.kebabPlural}/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.edit')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  const parsed = update${c.n.Pascal}Schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }
${refValidation(c)}
  try {
    const updated = await db
      .update(${t})
      .set({ ...to${c.n.Pascal}Row(parsed.data), updatedAt: new Date().toISOString() })
      .where(eq(${t}.id, id))
      .returning({ id: ${t}.id })
    if (!updated.length) return notFound()
    return NextResponse.json(serialize${c.n.Pascal}((await find${c.n.Pascal}(id))!))
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
}

// DELETE /api/${c.n.kebabPlural}/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission('${c.n.snakePlural}.delete')
  if (isGuardError(guard)) return guard

  const id = await parseId(params)
  if (!id) return notFound()

  try {
    const deleted = await db.delete(${t}).where(eq(${t}.id, id)).returning({ id: ${t}.id })
    if (!deleted.length) return notFound()
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
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

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

// ─── app/api/<plural>/options/route.ts ────────────────────────────────────────
export const optionsRouteFile = (c: Ctx) => {
  const t = c.n.camelPlural
  const d = c.display
  return `import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ${t} } from '@/lib/db/schema'
import { requirePermission, isGuardError } from '@/lib/api/api-guard'

// GET /api/${c.n.kebabPlural}/options → [{ value, label }] para selects de otros módulos
export async function GET() {
  const guard = await requirePermission('${c.n.snakePlural}.view')
  if (isGuardError(guard)) return guard

  const rows = await db
    .select({ value: ${t}.id${d ? `, label: ${t}.${d.camel}` : ''} })
    .from(${t})
    .orderBy(asc(${d ? `${t}.${d.camel}` : `${t}.id`}))
    .limit(500)

  return NextResponse.json(${d ? 'rows' : 'rows.map(r => ({ value: r.value, label: `#${r.value}` }))'})
}
`
}

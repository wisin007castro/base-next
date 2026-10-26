/**
 * Generador de módulos CRUD siguiendo los patrones del proyecto.
 *
 *   npm run gen:crud -- <entidad> <campo:tipo>... [opciones]
 *   npm run gen:crud -- producto nombre:string codigo!:string descripcion?:text \
 *                       stock:int activo:boolean estado:enum(borrador|publicado)
 *
 * Ver `npm run gen:crud -- --help` y docs en CLAUDE.md.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseField, ownerField, FIELD_TYPES, type RefTarget } from './fields'
import { buildNames } from './names'
import { manyFields, type Ctx } from './templates/context'
import * as server from './templates/server'
import * as client from './templates/client'
import * as ui from './templates/ui'

const HELP = `
Uso: npm run gen:crud -- <entidad> <campo:tipo>... [opciones]

  <entidad>   singular en snake_case: producto, orden_compra
  <campo>     nombre[?][!]:tipo[=Etiqueta]   (? = opcional, ! = único, =Título con tildes)
  tipos       ${FIELD_TYPES.join(', ')}
              enum(a|b|c)
              ref(<módulo>[,restrict|cascade|set null])   N:1 — qué hacer al eliminar el destino
              many(<módulo>)                              N:M (tabla intermedia), nombre terminado en _ids

Opciones:
  --plural=ordenes_compra   plural (por defecto se calcula: producto → productos)
  --label="Órdenes de compra"         título en la UI
  --label-singular="orden de compra"  nombre en textos ("Nueva orden de compra")
  --fem                     género femenino ("Nueva", "la") — p. ej. categoria
  --owner                   agrega autor_id: lo asigna el servidor con el usuario de la sesión
  --soft-delete             deleted_at + restaurar + borrado definitivo (permiso force_delete)
  --dry-run                 muestra qué haría sin escribir nada
  --force                   regenera un módulo existente (sobrescribe sus archivos y bloques)

Ejemplos:
  npm run gen:crud -- etiqueta "nombre!:string=Nombre" --fem
  npm run gen:crud -- categoria "nombre!:string=Nombre" --fem --soft-delete
  npm run gen:crud -- publicacion "titulo:string=Título" contenido:text \\
    "categoria_id:ref(categorias)=Categoría" "etiqueta_ids?:many(etiquetas)=Etiquetas" --owner --fem --soft-delete
`

const ROOT = process.cwd()
/** Registro de módulos generados: permite que \`ref\`/\`many\` sepan la tabla y la etiqueta del destino */
const REGISTRY = join(ROOT, 'scripts/gen-crud/modules.json')

interface RegistryEntry {
  entity: string
  table: string
  display: string | null
  softDelete: boolean
  PascalPlural: string
  camelPlural: string
  kebabPlural: string
}
/** users no es un módulo generado: solo sirve como destino del autor (--owner) */
const USERS_TARGET: RefTarget = {
  plural: 'users',
  entity: 'user',
  table: 'users',
  displayCamel: 'username',
  softDelete: true,
  module: null,
}

const log = (msg = '') => console.log(msg)
const fail = (msg: string): never => {
  console.error(`✖ ${msg}`)
  process.exit(1)
}

// ─── Argumentos ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
if (!args.length || args.includes('--help') || args.includes('-h')) {
  log(HELP)
  process.exit(0)
}

const flags = new Map<string, string | true>()
const positional: string[] = []
for (const arg of args) {
  const m = arg.match(/^--([a-z-]+)(?:=(.*))?$/)
  if (m) flags.set(m[1], m[2] ?? true)
  else positional.push(arg)
}
const flag = (name: string) => (typeof flags.get(name) === 'string' ? (flags.get(name) as string) : undefined)

const [entity, ...fieldSpecs] = positional
if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(entity ?? ''))
  fail(`Entidad inválida "${entity}": usa snake_case singular (producto, orden_compra)`)
if (!fieldSpecs.length) fail('Indica al menos un campo, p. ej. nombre:string')

let fields
try {
  fields = fieldSpecs.map(parseField)
} catch (e) {
  fail((e as Error).message)
}
const dupes = fields!.map(f => f.name).filter((n, i, a) => a.indexOf(n) !== i)
if (dupes.length) fail(`Campos repetidos: ${dupes.join(', ')}`)

const n = buildNames(entity, {
  plural: flag('plural'),
  label: flag('label'),
  labelSingular: flag('label-singular'),
  fem: flags.has('fem'),
})
if (n.snakePlural === n.snake) fail('El plural no puede ser igual al singular: usa --plural=')

// Resolver ref / many contra el registro de módulos generados
const registry: Record<string, RegistryEntry> = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : {}
for (const f of fields!.filter(f => f.type === 'ref' || f.type === 'many')) {
  const target = registry[f.refPlural!]
  if (!target) {
    fail(
      `"${f.name}": el módulo "${f.refPlural}" no existe en el registro. Genera primero ese módulo ` +
        `(registrados: ${Object.keys(registry).join(', ') || 'ninguno'})`,
    )
  }
  if (f.refPlural === n.snakePlural) fail(`"${f.name}": las relaciones a sí mismo (árboles) aún no están soportadas`)
  f.ref = {
    plural: f.refPlural!,
    entity: target.entity,
    table: target.table,
    displayCamel: target.display,
    softDelete: !!target.softDelete,
    module: { PascalPlural: target.PascalPlural, camelPlural: target.camelPlural, kebabPlural: target.kebabPlural },
  }
  if (f.type === 'ref' && f.onDelete === 'cascade' && !target.softDelete && flags.has('soft-delete')) {
    log(`⚠ "${f.name}": cascade con un destino sin soft delete solo aplica a borrados definitivos del destino`)
  }
}
if (flags.has('owner')) fields!.push(ownerField(USERS_TARGET))

const ctx: Ctx = {
  n,
  fields: fields!,
  display: fields!.find(f => f.type === 'string') ?? null,
  softDelete: flags.has('soft-delete'),
}
const dryRun = flags.has('dry-run')
const force = flags.has('force')

// ─── Archivos nuevos ──────────────────────────────────────────────────────────
const hasEnums = ctx.fields.some(f => f.type === 'enum')
const files: [string, string][] = [
  ...(hasEnums ? ([[`lib/constants/${n.kebabPlural}.ts`, server.constantsFile(ctx)]] as [string, string][]) : []),
  [`lib/types/${n.kebab}.types.ts`, server.typesFile(ctx)],
  [`lib/api/schemas/${n.kebab}.schema.ts`, server.schemaFile(ctx)],
  [`lib/api/serializers/${n.kebab}.serializer.ts`, server.serializerFile(ctx)],
  [`app/api/${n.kebabPlural}/route.ts`, server.listRouteFile(ctx)],
  [`app/api/${n.kebabPlural}/[id]/route.ts`, server.itemRouteFile(ctx)],
  ...(ctx.softDelete
    ? ([
        [`app/api/${n.kebabPlural}/[id]/restore/route.ts`, server.restoreRouteFile(ctx)],
        [`app/api/${n.kebabPlural}/[id]/force/route.ts`, server.forceRouteFile(ctx)],
      ] as [string, string][])
    : []),
  [`app/api/${n.kebabPlural}/bulk/route.ts`, server.bulkRouteFile(ctx)],
  [`app/api/${n.kebabPlural}/options/route.ts`, server.optionsRouteFile(ctx)],
  [`lib/api/${n.kebabPlural}.api.ts`, client.apiClientFile(ctx)],
  [`lib/hooks/${n.kebabPlural}.hooks.ts`, client.hooksFile(ctx)],
  [`lib/forms/${n.kebab}.form.ts`, client.formSchemaFile(ctx)],
  [`lib/filters/${n.kebabPlural}.filters.ts`, client.filtersFile(ctx)],
  [`app/components/${n.kebabPlural}/${n.Pascal}Form.tsx`, ui.formComponentFile(ctx)],
  [`app/components/${n.kebabPlural}/${n.PascalPlural}Table.tsx`, ui.tableComponentFile(ctx)],
  [`app/${n.kebabPlural}/page.tsx`, ui.listPageFile(ctx)],
  [`app/${n.kebabPlural}/nuevo/page.tsx`, ui.newPageFile(ctx)],
  [`app/${n.kebabPlural}/[id]/editar/page.tsx`, ui.editPageFile(ctx)],
]

const existing = files.map(([p]) => p).filter(p => existsSync(join(ROOT, p)))
if (existing.length && !force) {
  fail(`Ya existen archivos del módulo (usa --force para regenerarlo):\n  ${existing.join('\n  ')}`)
}
if (existsSync(join(ROOT, `app/${n.kebabPlural}`)) && !existing.length && !force) {
  fail(`La ruta app/${n.kebabPlural} ya existe y no es de un módulo generado`)
}

// ─── Bloques en archivos existentes ───────────────────────────────────────────
// Cada módulo escribe su bloque entre `@gen:begin <módulo>` / `@gen:end <módulo>`:
// regenerar reemplaza el bloque (nunca duplica); si no existe, se inserta antes del marcador.
interface Block {
  file: string
  marker: string
  content: string
  /** Ajustes extra del archivo (imports) */
  after?: (src: string) => string
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

function upsertBlock(src: string, { marker, content }: Block, id: string) {
  const begin = `// @gen:begin ${id}`
  const end = `// @gen:end ${id}`
  const block = content ? `${begin}\n${content.replace(/\n?$/, '\n')}${end}\n` : ''
  const re = new RegExp(`[ \\t]*${escapeRe(begin)}\\n[\\s\\S]*?${escapeRe(end)}\\n`)
  if (re.test(src)) {
    const indent = src.match(re)![0].match(/^[ \t]*/)![0]
    return src.replace(re, block ? indentBlock(block, indent) : '')
  }
  if (!block) return src
  const i = src.indexOf(marker)
  if (i === -1) fail(`No se encontró el marcador "${marker}"`)
  const lineStart = src.lastIndexOf('\n', i) + 1
  const indent = src.slice(lineStart, i)
  return src.slice(0, lineStart) + indentBlock(block, indent) + src.slice(lineStart)
}

/** Las entradas de arrays ya traen su sangría; los marcadores toman la del marcador original */
const indentBlock = (block: string, indent: string) =>
  block
    .split('\n')
    .map(line => (line.startsWith('// @gen:') ? indent + line : line))
    .join('\n')

const addNamedImport = (src: string, from: string, name: string, fallbackLine: string) => {
  const re = new RegExp(`import \\{([^}]*)\\} from '${escapeRe(from)}'`)
  const m = src.match(re)
  if (m) {
    return m[1]
      .split(',')
      .map(s => s.trim())
      .includes(name)
      ? src
      : src.replace(re, `import {${m[1].trimEnd()}, ${name} } from '${from}'`)
  }
  return fallbackLine + src
}

const usesNumber = ctx.fields.some(f => f.type === 'number')
const blocks: Block[] = [
  {
    file: 'lib/db/schema/index.ts',
    marker: '// @gen:tables',
    content: server.drizzleTable(ctx),
    after: src => {
      let out = src
      for (const name of [
        ...(usesNumber ? ['real'] : []),
        'uniqueIndex',
        'index',
        ...(manyFields(ctx).length ? ['primaryKey'] : []),
      ]) {
        out = addNamedImport(out, 'drizzle-orm/sqlite-core', name, '')
      }
      const enumImport = server.drizzleEnumImport(ctx)
      if (enumImport && !out.includes(enumImport.trim())) {
        const firstImportEnd = out.indexOf('\n', out.indexOf("from 'drizzle-orm'")) + 1
        out = out.slice(0, firstImportEnd) + enumImport + out.slice(firstImportEnd)
      }
      return out
    },
  },
  { file: 'lib/constants/query-keys.ts', marker: '// @gen:query-keys', content: client.queryKeysSnippet(ctx) },
  { file: 'lib/auth/module-permissions.ts', marker: '// @gen:modules', content: ui.moduleEntry(ctx) },
  {
    file: 'app/constants/menu.ts',
    marker: '// @gen:menu',
    content: ui.menuEntry(ctx),
    after: src =>
      addNamedImport(
        src,
        'react-icons/hi',
        'HiOutlineViewGrid',
        "import { HiOutlineViewGrid } from 'react-icons/hi'\n",
      ),
  },
  { file: 'lib/api/dependents.ts', marker: '// @gen:dependents', content: server.dependentsEntries(ctx) },
  { file: 'lib/constants/query-dependencies.ts', marker: '// @gen:dependencies', content: ui.dependencyEntries(ctx) },
]

// ─── Ejecutar ─────────────────────────────────────────────────────────────────
log(
  `\n${dryRun ? '[dry-run] ' : ''}Módulo "${n.label}" → /${n.kebabPlural}  (tabla ${n.snakePlural}, permisos ${n.snakePlural}.*${ctx.softDelete ? ', soft delete' : ''})\n`,
)

const created: string[] = []
for (const [path, content] of files) {
  log(`  ${existing.includes(path) ? '↻' : '+'} ${path}`)
  if (dryRun) continue
  mkdirSync(dirname(join(ROOT, path)), { recursive: true })
  writeFileSync(join(ROOT, path), content)
  created.push(path)
}

for (const b of blocks) {
  const abs = join(ROOT, b.file)
  const src = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n')
  let out = upsertBlock(src, b, n.snakePlural)
  if (b.after) out = b.after(out)
  if (out === src) continue
  log(`  ~ ${b.file}`)
  if (!dryRun) writeFileSync(abs, out)
}

if (!dryRun) {
  registry[n.snakePlural] = {
    entity: n.snake,
    table: n.camelPlural,
    display: ctx.display?.camel ?? null,
    softDelete: ctx.softDelete,
    PascalPlural: n.PascalPlural,
    camelPlural: n.camelPlural,
    kebabPlural: n.kebabPlural,
  }
  writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n')
  log('  ~ scripts/gen-crud/modules.json')
}

// Solo los archivos nuevos: formatear los existentes cambiaría líneas ajenas al módulo
if (!dryRun && created.length) {
  try {
    execFileSync(
      process.execPath,
      [join(ROOT, 'node_modules/prettier/bin/prettier.cjs'), '--write', '--log-level=warn', ...created],
      { cwd: ROOT, stdio: 'inherit' },
    )
  } catch {
    log('\n⚠ Prettier falló: revisa el formato de los archivos generados')
  }
}

log(`
${dryRun ? 'Nada escrito (dry-run).' : '✔ Listo.'} Siguientes pasos:

  1. npm run db:generate      # migración de ${n.snakePlural} (revisa el SQL)
  2. npm run db:migrate
  3. npm run db:permissions   # crea ${n.snakePlural}.view|create|edit|delete${ctx.softDelete ? '|force_delete' : ''} y los asigna a admin
  4. Abre /${n.kebabPlural} (los permisos se releen solos; el menú se actualiza al volver a la pestaña)

  Para dar acceso a otros roles: /roles → editar rol → marcar ${n.snakePlural}.*
`)

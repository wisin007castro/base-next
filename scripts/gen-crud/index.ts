/**
 * Generador de módulos CRUD siguiendo los patrones del proyecto.
 *
 *   npm run gen:crud -- <entidad> <campo:tipo>... [opciones]
 *   npm run gen:crud -- producto nombre:string codigo!:string descripcion?:text precio:number \
 *                       stock:int activo:boolean estado:enum(borrador|publicado)
 *
 * Ver `npm run gen:crud -- --help` y docs en CLAUDE.md.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseField, ownerField, FIELD_TYPES, type RefTarget } from './fields'
import { buildNames } from './names'
import type { Ctx } from './templates/context'
import * as server from './templates/server'
import * as client from './templates/client'
import * as ui from './templates/ui'

const HELP = `
Uso: npm run gen:crud -- <entidad> <campo:tipo>... [opciones]

  <entidad>   singular en snake_case: producto, orden_compra
  <campo>     nombre[?][!]:tipo[=Etiqueta]   (? = opcional, ! = único, =Título con tildes)
  tipos       ${FIELD_TYPES.join(', ')}   — enum(a|b|c), ref(<módulo generado>)

Opciones:
  --plural=ordenes_compra   plural (por defecto se calcula: producto → productos)
  --label="Órdenes de compra"         título en la UI
  --label-singular="orden de compra"  nombre en textos ("Nueva orden de compra")
  --fem                     género femenino ("Nueva", "la") — p. ej. categoria
  --owner                   agrega autor_id: lo asigna el servidor con el usuario de la sesión
  --dry-run                 muestra qué haría sin escribir nada
  --force                   sobrescribe archivos existentes del módulo

Ejemplos:
  npm run gen:crud -- producto nombre:string codigo!:string descripcion?:text \\
    precio:number stock:int activo:boolean "estado:enum(borrador|publicado)"

  npm run gen:crud -- publicacion titulo:string contenido:text "categoria_id:ref(categorias)" --owner --fem
`

const ROOT = process.cwd()
/** Registro de módulos generados: permite que `ref(...)` sepa la tabla y la etiqueta del destino */
const REGISTRY = join(ROOT, 'scripts/gen-crud/modules.json')

interface RegistryEntry {
  table: string
  display: string | null
  PascalPlural: string
  camelPlural: string
  kebabPlural: string
}
const USERS_TARGET: RefTarget = { plural: 'users', table: 'users', displayCamel: 'username', module: null }
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

// Resolver los ref contra el registro de módulos generados
const registry: Record<string, RegistryEntry> = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : {}
for (const f of fields!.filter(f => f.type === 'ref')) {
  const target = registry[f.refPlural!]
  if (!target) {
    fail(
      `"${f.name}": el módulo "${f.refPlural}" no existe en el registro. Genera primero ese módulo ` +
        `(registrados: ${Object.keys(registry).join(', ') || 'ninguno'})`,
    )
  }
  f.ref = {
    plural: f.refPlural!,
    table: target.table,
    displayCamel: target.display,
    module: { PascalPlural: target.PascalPlural, camelPlural: target.camelPlural, kebabPlural: target.kebabPlural },
  }
}
if (flags.has('owner')) fields!.push(ownerField(USERS_TARGET))

const ctx: Ctx = { n, fields: fields!, display: fields!.find(f => f.type === 'string') ?? null }
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
  fail(`Ya existen archivos del módulo (usa --force para sobrescribir):\n  ${existing.join('\n  ')}`)
}
if (existsSync(join(ROOT, `app/${n.kebabPlural}`)) && !existing.length && !force) {
  fail(`La ruta app/${n.kebabPlural} ya existe y no es de un módulo generado`)
}

// ─── Inserciones en archivos existentes (idempotentes) ────────────────────────
interface Insert {
  file: string
  /** Si este texto ya está en el archivo, se omite (módulo ya registrado) */
  skipIf: string
  apply: (src: string) => string
}

const beforeMarker = (marker: string, snippet: string) => (src: string) => {
  const i = src.indexOf(marker)
  if (i === -1) fail(`No se encontró el marcador "${marker}"`)
  const lineStart = src.lastIndexOf('\n', i) + 1
  return src.slice(0, lineStart) + snippet + src.slice(lineStart)
}

const addNamedImport = (src: string, from: string, name: string, fallbackLine: string) => {
  const re = new RegExp(`import \\{([^}]*)\\} from '${from.replace(/[/.]/g, '\\$&')}'`)
  const m = src.match(re)
  if (m)
    return m[1]
      .split(',')
      .map(s => s.trim())
      .includes(name)
      ? src
      : src.replace(re, `import {${m[1].trimEnd()}, ${name} } from '${from}'`)
  return fallbackLine + src
}

const inserts: Insert[] = [
  {
    file: 'lib/db/schema/index.ts',
    skipIf: `sqliteTable('${n.snakePlural}'`,
    apply: src => {
      let out = beforeMarker('// @gen:tables', server.drizzleTable(ctx) + '\n')(src)
      if (ctx.fields.some(f => f.type === 'number')) {
        out = addNamedImport(out, 'drizzle-orm/sqlite-core', 'real', '')
      }
      const enumImport = server.drizzleEnumImport(ctx)
      if (enumImport) {
        const firstImportEnd = out.indexOf('\n', out.indexOf("from 'drizzle-orm'")) + 1
        out = out.slice(0, firstImportEnd) + enumImport + out.slice(firstImportEnd)
      }
      return out
    },
  },
  {
    file: 'lib/constants/query-keys.ts',
    skipIf: `export const ${n.camel}Keys`,
    apply: beforeMarker('// @gen:query-keys', client.queryKeysSnippet(ctx) + '\n'),
  },
  {
    file: 'lib/auth/module-permissions.ts',
    skipIf: `prefix: '${n.snakePlural}'`,
    apply: beforeMarker('// @gen:modules', ui.moduleEntry(ctx)),
  },
  {
    file: 'app/constants/menu.ts',
    skipIf: `href: '/${n.kebabPlural}'`,
    apply: src =>
      addNamedImport(
        beforeMarker('// @gen:menu', ui.menuEntry(ctx))(src),
        'react-icons/hi',
        'HiOutlineViewGrid',
        "import { HiOutlineViewGrid } from 'react-icons/hi'\n",
      ),
  },
]

// ─── Ejecutar ─────────────────────────────────────────────────────────────────
log(
  `\n${dryRun ? '[dry-run] ' : ''}Módulo "${n.label}" → /${n.kebabPlural}  (tabla ${n.snakePlural}, permisos ${n.snakePlural}.*)\n`,
)

const created: string[] = []
const modified: string[] = []
for (const [path, content] of files) {
  log(`  ${existing.includes(path) ? '↻' : '+'} ${path}`)
  if (dryRun) continue
  mkdirSync(dirname(join(ROOT, path)), { recursive: true })
  writeFileSync(join(ROOT, path), content)
  created.push(path)
}

for (const ins of inserts) {
  const abs = join(ROOT, ins.file)
  const src = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n')
  if (src.includes(ins.skipIf)) {
    log(`  = ${ins.file} (ya registrado)`)
    continue
  }
  const out = ins.apply(src)
  log(`  ~ ${ins.file}`)
  if (dryRun) continue
  writeFileSync(abs, out)
  modified.push(ins.file)
}

if (!dryRun) {
  registry[n.snakePlural] = {
    table: n.camelPlural,
    display: ctx.display?.camel ?? null,
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
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    )
  } catch {
    log('\n⚠ Prettier falló: revisa el formato de los archivos generados')
  }
}

log(`
${dryRun ? 'Nada escrito (dry-run).' : '✔ Listo.'} Siguientes pasos:

  1. npm run db:generate      # migración de la tabla ${n.snakePlural} (revisa el SQL)
  2. npm run db:migrate
  3. npm run db:permissions   # crea ${n.snakePlural}.view|create|edit|delete y los asigna a admin
  4. Vuelve a iniciar sesión (los permisos viajan en el JWT) y abre /${n.kebabPlural}

  Para dar acceso a otros roles: /roles → editar rol → marcar ${n.snakePlural}.*
`)

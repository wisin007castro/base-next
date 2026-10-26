import type { Field } from '../fields'
import type { Names } from '../names'

export interface Ctx {
  n: Names
  /** Todos los campos, incluido el autor (`--owner`) */
  fields: Field[]
  /** Campo que identifica el registro en la UI (primer `string`), o null → se usa el id */
  display: Field | null
  /** `--soft-delete`: deleted_at, restaurar, borrado definitivo */
  softDelete: boolean
}

/** Campos que el usuario escribe (sin el autor, que lo pone el servidor) */
export const formFields = (c: Ctx) => c.fields.filter(f => !f.owner)
/** Campos que son columnas de la tabla (sin los many) */
export const columnFields = (c: Ctx) => c.fields.filter(f => f.type !== 'many')
export const refFields = (c: Ctx) => c.fields.filter(f => f.type === 'ref')
export const manyFields = (c: Ctx) => c.fields.filter(f => f.type === 'many')
export const ownerOf = (c: Ctx) => c.fields.find(f => f.owner) ?? null

/** Módulos distintos cuyas opciones necesita un form/listado (ref no-owner y many) */
export const refModules = (c: Ctx, fields = formFields(c).filter(f => f.type === 'ref' || f.type === 'many')) => [
  ...new Map(fields.map(f => [f.ref!.module!.kebabPlural, f.ref!.module!])).values(),
]

/** Tabla intermedia de un campo many: `publicaciones_etiquetas` */
export const pivotOf = (c: Ctx, f: Field) => {
  const target = f.ref!
  const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase())
  return {
    sql: `${c.n.snakePlural}_${target.plural}`,
    table: toCamel(`${c.n.snakePlural}_${target.plural}`),
    parentFk: `${c.n.snake}_id`,
    parentFkCamel: toCamel(`${c.n.snake}_id`),
    targetFk: `${target.entity}_id`,
    targetFkCamel: toCamel(`${target.entity}_id`),
  }
}

/** Palabras que cambian con el género gramatical de la entidad */
export const words = (c: Ctx) => ({
  nuevo: c.n.fem ? 'Nueva' : 'Nuevo',
  el: c.n.fem ? 'la' : 'el',
  registrados: c.n.fem ? 'registradas' : 'registrados',
  eliminados: c.n.fem ? 'eliminadas' : 'eliminados',
})

/** Expresión JSX/TS que muestra el registro `item` (p. ej. su nombre) */
export const displayExpr = (c: Ctx, item = 'item') => (c.display ? `${item}.${c.display.name}` : `\`#\${${item}.id}\``)

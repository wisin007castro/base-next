import type { Field } from '../fields'
import type { Names } from '../names'

export interface Ctx {
  n: Names
  /** Todos los campos, incluido el autor (`--owner`) */
  fields: Field[]
  /** Campo que identifica el registro en la UI (primer `string`), o null → se usa el id */
  display: Field | null
}

/** Campos que el usuario escribe (sin el autor, que lo pone el servidor) */
export const formFields = (c: Ctx) => c.fields.filter(f => !f.owner)
export const refFields = (c: Ctx) => c.fields.filter(f => f.type === 'ref')
export const ownerOf = (c: Ctx) => c.fields.find(f => f.owner) ?? null

/** Módulos distintos cuyas opciones necesita un form/listado (refs no-owner) */
export const refModules = (c: Ctx, fields = formFields(c).filter(f => f.type === 'ref')) => [
  ...new Map(fields.map(f => [f.ref!.module!.kebabPlural, f.ref!.module!])).values(),
]

/** Palabras que cambian con el género gramatical de la entidad */
export const words = (c: Ctx) => ({
  nuevo: c.n.fem ? 'Nueva' : 'Nuevo',
  el: c.n.fem ? 'la' : 'el',
  registrados: c.n.fem ? 'registradas' : 'registrados',
  eliminados: c.n.fem ? 'eliminadas' : 'eliminados',
})

/** Expresión JSX/TS que muestra el registro `item` (p. ej. su nombre) */
export const displayExpr = (c: Ctx, item = 'item') => (c.display ? `${item}.${c.display.name}` : `\`#\${${item}.id}\``)

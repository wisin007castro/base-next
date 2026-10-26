/** Variantes de nombre de una entidad. Entrada siempre en snake_case singular: `orden_compra`. */
export interface Names {
  /** orden_compra */
  snake: string
  /** ordenes_compra — tabla, prefijo de permisos y claves de API */
  snakePlural: string
  /** OrdenCompra — tipos */
  Pascal: string
  /** OrdenesCompra — componentes de listado */
  PascalPlural: string
  /** ordenCompra */
  camel: string
  /** ordenesCompra — variables, hooks, tabla Drizzle */
  camelPlural: string
  /** ordenes-compra — rutas y nombres de archivo */
  kebabPlural: string
  /** orden-compra */
  kebab: string
  /** ORDEN_COMPRA — constantes */
  CONST: string
  /** "Órdenes de compra" — títulos (editable con --label) */
  label: string
  /** "orden de compra" — textos en minúscula (editable con --label-singular) */
  labelSingular: string
  /** Género gramatical para "Nuevo/Nueva", "el/la"… */
  fem: boolean
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const toPascal = (snake: string) => snake.split('_').map(capitalize).join('')
const toCamel = (snake: string) => {
  const p = toPascal(snake)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

export const humanize = (snake: string) => capitalize(snake.replace(/_/g, ' '))

/** Plural en español de la primera palabra: producto→productos, orden_compra→ordenes_compra */
export function pluralize(snake: string): string {
  const [first, ...rest] = snake.split('_')
  let plural: string
  if (/[aeiou]$/.test(first)) plural = `${first}s`
  else if (first.endsWith('z')) plural = `${first.slice(0, -1)}ces`
  else plural = `${first}es`
  return [plural, ...rest].join('_')
}

export function buildNames(
  snake: string,
  opts: { plural?: string; label?: string; labelSingular?: string; fem?: boolean } = {},
): Names {
  const snakePlural = opts.plural ?? pluralize(snake)
  return {
    snake,
    snakePlural,
    Pascal: toPascal(snake),
    PascalPlural: toPascal(snakePlural),
    camel: toCamel(snake),
    camelPlural: toCamel(snakePlural),
    kebab: snake.replace(/_/g, '-'),
    kebabPlural: snakePlural.replace(/_/g, '-'),
    CONST: snake.toUpperCase(),
    label: opts.label ?? humanize(snakePlural),
    labelSingular: opts.labelSingular ?? snake.replace(/_/g, ' '),
    fem: !!opts.fem,
  }
}

export { toCamel, toPascal }

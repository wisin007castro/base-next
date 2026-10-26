/**
 * Qué cachés muestran datos de otro módulo (etiquetas de relaciones, autores…).
 * `[origen, dependiente]`: al cambiar algo en `origen`, se invalidan las listas y detalles de `dependiente`.
 * Ej.: renombrar una categoría debe refrescar el listado de publicaciones y el blog.
 *
 * Las claves son la raíz de cada factory de query-keys (`['publicaciones', 'list', …]`).
 * `npm run gen:crud` agrega las de cada `ref` / `many` antes del marcador.
 */
export const QUERY_DEPENDENCIES: [source: string, dependent: string][] = [
  ['users', 'blog'],
  ['users', 'publicaciones'],
  ['categorias', 'blog'],
  ['publicaciones', 'blog'],
  // @gen:dependencies
]

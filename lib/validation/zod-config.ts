import { z } from 'zod'

/**
 * Mensajes de Zod en español para todo el proyecto (API y formularios).
 * Los mensajes definidos en el propio schema tienen prioridad sobre estos.
 */
z.config(z.locales.es())
z.config({
  customError: iss => {
    // Campo vacío en un input numérico/select (el form manda null/undefined)
    if (iss.code === 'invalid_type' && (iss.input === null || iss.input === undefined))
      return 'Este campo es obligatorio'
    if (iss.code === 'too_small' && iss.origin === 'string') {
      return Number(iss.minimum) <= 1 ? 'Este campo es obligatorio' : `Mínimo ${iss.minimum} caracteres`
    }
    if (iss.code === 'too_big' && iss.origin === 'string') return `Máximo ${iss.maximum} caracteres`
    if (iss.code === 'invalid_format' && iss.format === 'email') return 'Correo electrónico inválido'
    return undefined
  },
})

/** Fecha `AAAA-MM-DD` (inputs type="date" y columnas de fecha) */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export { z }

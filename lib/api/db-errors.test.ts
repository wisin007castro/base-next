import { describe, expect, it } from 'vitest'
import { foreignKeyViolationResponse, uniqueViolationResponse } from './db-errors'

const sqliteError = (code: string, message: string) => Object.assign(new Error(message), { code })

describe('uniqueViolationResponse', () => {
  it('pone el error en la columna', async () => {
    const res = uniqueViolationResponse(
      sqliteError('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: categorias.nombre'),
    )
    expect(res?.status).toBe(422)
    expect((await res!.json()).errors.fieldErrors).toHaveProperty('nombre')
  })

  it('índice compuesto: la última columna (la más específica)', async () => {
    const res = uniqueViolationResponse(
      sqliteError(
        'SQLITE_CONSTRAINT_UNIQUE',
        'UNIQUE constraint failed: user_profiles.tipo_documento, user_profiles.numero_documento',
      ),
    )
    expect(Object.keys((await res!.json()).errors.fieldErrors)).toEqual(['numero_documento'])
  })

  it('otros errores: null (que el handler los relance)', () => {
    expect(uniqueViolationResponse(new Error('otra cosa'))).toBeNull()
  })
})

describe('foreignKeyViolationResponse', () => {
  it('RESTRICT llega como SQLITE_CONSTRAINT_TRIGGER: igual se reconoce', () => {
    const res = foreignKeyViolationResponse(sqliteError('SQLITE_CONSTRAINT_TRIGGER', 'FOREIGN KEY constraint failed'))
    expect(res?.status).toBe(409)
  })
})

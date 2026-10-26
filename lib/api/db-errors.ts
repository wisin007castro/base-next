import { NextResponse } from 'next/server'

/**
 * Convierte una violación de UNIQUE de SQLite en un 422 con el error en el campo:
 * "UNIQUE constraint failed: productos.codigo" → { fieldErrors: { codigo: [...] } }.
 * En índices compuestos ("…: t.tipo_documento, t.numero_documento") se usa la última columna,
 * la más específica. Devuelve null si el error es otro (que el handler lo relance).
 */
export function uniqueViolationResponse(err: unknown): NextResponse | null {
  const e = err as { code?: string; message?: string }
  if (e?.code !== 'SQLITE_CONSTRAINT_UNIQUE') return null
  const columns = e.message?.match(/UNIQUE constraint failed: (.+)$/)?.[1].split(',') ?? []
  const column = columns.at(-1)?.trim().split('.').at(-1) || 'id'
  return NextResponse.json(
    {
      message: 'Datos inválidos',
      errors: { formErrors: [], fieldErrors: { [column]: ['Ya existe un registro con este valor'] } },
    },
    { status: 422 },
  )
}

/**
 * Violación de FOREIGN KEY al borrar un registro del que dependen otros
 * (p. ej. una categoría con publicaciones) → 409 con un mensaje claro.
 */
export function foreignKeyViolationResponse(err: unknown): NextResponse | null {
  const e = err as { code?: string; message?: string }
  // ON DELETE RESTRICT llega como SQLITE_CONSTRAINT_TRIGGER; el mensaje es el mismo en todos los casos
  if (!e?.code?.startsWith('SQLITE_CONSTRAINT') || !e.message?.includes('FOREIGN KEY constraint failed')) return null
  return NextResponse.json(
    { message: 'No se puede eliminar: hay registros que dependen de este. Reasígnalos o elimínalos primero.' },
    { status: 409 },
  )
}

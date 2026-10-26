import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

/**
 * Qué tablas apuntan a cada módulo y qué hacer con ellas cuando el padre se elimina (soft delete).
 * Las FOREIGN KEY solo actúan en borrados físicos; un soft delete es un UPDATE, así que la
 * política `restrict` / `cascade` se aplica aquí. `npm run gen:crud` agrega entradas antes del marcador.
 *
 * - restrict: no se puede eliminar el padre si tiene hijos activos (409)
 * - cascade:  eliminar el padre elimina (soft) a sus hijos; restaurarlo los restaura
 * - set null: no se toca el hijo (al borrar definitivamente, la FK lo desvincula)
 */
export interface Dependent {
  /** Prefijo del módulo padre (`categorias`) */
  parent: string
  /** Prefijo del módulo hijo (`publicaciones`) */
  child: string
  label: string
  table: SQLiteTable & { id: SQLiteColumn }
  fk: SQLiteColumn
  /** Columna deleted_at del hijo, o null si el hijo no tiene soft delete */
  deletedAt: SQLiteColumn | null
  onDelete: 'restrict' | 'cascade' | 'set null'
}

export const DEPENDENTS: Dependent[] = [
  // @gen:begin publicaciones
  {
    parent: 'categorias',
    child: 'publicaciones',
    label: 'Publicaciones',
    table: schema.publicaciones,
    fk: schema.publicaciones.categoriaId,
    deletedAt: schema.publicaciones.deletedAt,
    onDelete: 'restrict',
  },
  // @gen:end publicaciones
  // @gen:dependents
]

/** Transacción de Drizzle (better-sqlite3: síncrona) */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const activeChildren = (d: Dependent) => (d.deletedAt ? isNull(d.deletedAt) : undefined)

/** Mensaje de error si algún padre tiene hijos activos con política `restrict`, o null */
export function restrictMessage(tx: Tx, parent: string, ids: number[]): string | null {
  for (const d of DEPENDENTS.filter(d => d.parent === parent && d.onDelete === 'restrict')) {
    const [{ total }] = tx
      .select({ total: count() })
      .from(d.table)
      .where(and(inArray(d.fk, ids), activeChildren(d)))
      .all()
    if (total > 0)
      return `No se puede eliminar: ${d.label} tiene ${total} registro(s) que dependen de este. Reasígnalos o elimínalos primero.`
  }
  return null
}

/** Soft delete en cascada de los hijos (recursivo), con el mismo timestamp que el padre */
export function cascadeSoftDelete(tx: Tx, parent: string, ids: number[], now: string) {
  if (!ids.length) return
  for (const d of DEPENDENTS.filter(d => d.parent === parent && d.onDelete === 'cascade' && d.deletedAt)) {
    const children = tx
      .select({ id: d.table.id })
      .from(d.table)
      .where(and(inArray(d.fk, ids), isNull(d.deletedAt!)))
      .all()
      .map(r => r.id as number)
    if (!children.length) continue
    tx.update(d.table).set({ deletedAt: now, updatedAt: now }).where(inArray(d.table.id, children)).run()
    cascadeSoftDelete(tx, d.child, children, now)
  }
}

/**
 * Restaura los hijos que se eliminaron en cascada junto con el padre:
 * los que tienen exactamente el mismo `deleted_at` (los eliminados antes, por separado, siguen eliminados).
 */
export function cascadeRestore(tx: Tx, parent: string, ids: number[], deletedAt: string) {
  if (!ids.length) return
  for (const d of DEPENDENTS.filter(d => d.parent === parent && d.onDelete === 'cascade' && d.deletedAt)) {
    const children = tx
      .select({ id: d.table.id })
      .from(d.table)
      .where(and(inArray(d.fk, ids), eq(d.deletedAt!, deletedAt)))
      .all()
      .map(r => r.id as number)
    if (!children.length) continue
    tx.update(d.table)
      .set({ deletedAt: null, updatedAt: new Date().toISOString() })
      .where(inArray(d.table.id, children))
      .run()
    cascadeRestore(tx, d.child, children, deletedAt)
  }
}

// Evita "schema importado pero sin uso" mientras no haya dependientes registrados
void schema

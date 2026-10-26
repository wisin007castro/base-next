import { describe, expect, it } from 'vitest'
import { bulkToast, crudToasts, resolveToast } from './toast'

describe('crudToasts', () => {
  it('concuerda en género', () => {
    expect(crudToasts('Categoría', true).created).toBe('Categoría creada')
    expect(crudToasts('Rol').deleted).toBe('Rol eliminado')
    expect(crudToasts('Etiqueta', true).forceDeleted).toBe('Etiqueta eliminada definitivamente')
  })
})

describe('bulkToast', () => {
  it('singular y plural', () => {
    expect(bulkToast({ action: 'delete', ids: [1] })).toBe('1 registro eliminado')
    expect(bulkToast({ action: 'restore', ids: [1, 2, 3] })).toBe('3 registros restaurados')
    expect(bulkToast({ action: 'force_delete', ids: [1, 2] })).toBe('2 registros eliminados definitivamente')
  })

  it('acción desconocida: mensaje genérico', () => {
    expect(bulkToast({ action: 'archive', ids: [1, 2] })).toBe('2 registros actualizados')
  })
})

describe('resolveToast', () => {
  it('texto fijo o calculado con las variables', () => {
    expect(resolveToast('Hecho', undefined)).toBe('Hecho')
    expect(resolveToast(bulkToast, { action: 'delete', ids: [1, 2] })).toBe('2 registros eliminados')
  })
})

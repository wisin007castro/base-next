/**
 * Toasts de las mutaciones. Cada hook declara sus mensajes en `meta` y el MutationCache global
 * (TanStackProvider) los muestra: los componentes no llaman a `toast()` por cada acción.
 *
 *   useMutation({ mutationFn, meta: { successToast: t.created } })
 *   useMutation({ mutationFn, meta: { successToast: bulkToast, errorToast: true } })
 *
 * `errorToast` solo donde el error no tiene otro sitio donde verse: los formularios lo muestran
 * en el campo / <FormStatus> y los <ConfirmDialog> dentro del diálogo.
 */

/** Texto fijo o calculado a partir de las variables de la mutación */
export type ToastMessage = string | ((variables: never) => string)

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      successToast?: ToastMessage
      errorToast?: boolean
    }
  }
}

/** Mensajes de un CRUD: crudToasts('Categoría', true).created → "Categoría creada" */
export function crudToasts(label: string, fem = false) {
  const a = fem ? 'a' : 'o'
  return {
    created: `${label} cread${a}`,
    updated: `${label} actualizad${a}`,
    deleted: `${label} eliminad${a}`,
    restored: `${label} restaurad${a}`,
    forceDeleted: `${label} eliminad${a} definitivamente`,
  }
}

const BULK_VERBS: Record<string, [stem: string, suffix?: string]> = {
  delete: ['eliminad'],
  restore: ['restaurad'],
  force_delete: ['eliminad', ' definitivamente'],
  activate: ['activad'],
  deactivate: ['desactivad'],
}

/** "3 registros eliminados" / "1 registro restaurado" a partir de `{ action, ids }` */
export function bulkToast({ action, ids }: { action: string; ids: number[] }) {
  const [stem, suffix = ''] = BULK_VERBS[action] ?? ['actualizad']
  const one = ids.length === 1
  return `${ids.length} ${one ? 'registro' : 'registros'} ${stem}${one ? 'o' : 'os'}${suffix}`
}

export const resolveToast = (message: ToastMessage, variables: unknown) =>
  typeof message === 'function' ? (message as (v: unknown) => string)(variables) : message

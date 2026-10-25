import { z } from '@/lib/validation/zod-config'

/**
 * Filtros de listados pequeños que TanStack Table filtra/ordena en el cliente
 * (roles, permisos…): `?q=texto&sort=-name`
 */
export const listSearchSchema = z.object({
  q: z.string().catch(''),
  sort: z.string().catch('name'),
})

export type ListSearch = z.output<typeof listSearchSchema>

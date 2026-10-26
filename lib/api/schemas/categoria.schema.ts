import { z } from '@/lib/validation/zod-config'

export const createCategoriaSchema = z.object({
  nombre: z.string().trim().min(1).max(255),
  descripcion: z.string().trim().max(5000).nullish(),
})

export const updateCategoriaSchema = createCategoriaSchema.partial()

export const BULK_CATEGORIA_ACTIONS = ['delete', 'restore', 'force_delete'] as const

export const bulkCategoriasSchema = z.object({
  action: z.enum(BULK_CATEGORIA_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un registro').max(100),
})

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>
export type BulkCategoriaAction = (typeof BULK_CATEGORIA_ACTIONS)[number]

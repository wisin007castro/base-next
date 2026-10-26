import { z } from '@/lib/validation/zod-config'

export const createEtiquetaSchema = z.object({
  nombre: z.string().trim().min(1).max(255),
})

export const updateEtiquetaSchema = createEtiquetaSchema.partial()

export const BULK_ETIQUETA_ACTIONS = ['delete'] as const

export const bulkEtiquetasSchema = z.object({
  action: z.enum(BULK_ETIQUETA_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un registro').max(100),
})

export type CreateEtiquetaInput = z.infer<typeof createEtiquetaSchema>
export type UpdateEtiquetaInput = z.infer<typeof updateEtiquetaSchema>
export type BulkEtiquetaAction = (typeof BULK_ETIQUETA_ACTIONS)[number]

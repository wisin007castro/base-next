import { z, DATE_RE } from '@/lib/validation/zod-config'

export const createPublicacionSchema = z.object({
  titulo: z.string().trim().min(1).max(255),
  resumen: z.string().trim().max(255).nullish(),
  contenido: z.string().trim().min(1).max(5000),
  categoria_id: z.number().int().positive(),
  etiqueta_ids: z.array(z.number().int().positive()).max(100).optional(),
  publicada: z.boolean(),
  fecha_publicacion: z.string().regex(DATE_RE, 'Fecha inválida (AAAA-MM-DD)').nullish(),
})

export const updatePublicacionSchema = createPublicacionSchema.partial()

export const BULK_PUBLICACION_ACTIONS = ['delete', 'restore', 'force_delete'] as const

export const bulkPublicacionesSchema = z.object({
  action: z.enum(BULK_PUBLICACION_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un registro').max(100),
})

export type CreatePublicacionInput = z.infer<typeof createPublicacionSchema>
export type UpdatePublicacionInput = z.infer<typeof updatePublicacionSchema>
export type BulkPublicacionAction = (typeof BULK_PUBLICACION_ACTIONS)[number]

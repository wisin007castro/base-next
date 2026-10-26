import type { DefaultValues } from 'react-hook-form'
import { z } from '@/lib/validation/zod-config'
import { createEtiquetaSchema, type CreateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'
import type { Etiqueta } from '@/lib/types/etiqueta.types'

// Requeridos: la regla del servidor tal cual. Opcionales: aceptan '' / null / [] del form.
export const etiquetaFormSchema = z.object({
  nombre: createEtiquetaSchema.shape.nombre,
})

export type EtiquetaFormValues = z.infer<typeof etiquetaFormSchema>

export const etiquetaFormDefaults = (e?: Etiqueta): DefaultValues<EtiquetaFormValues> => ({
  nombre: e?.nombre ?? '',
})

/** Valores del form → DTO de la API ('' de los opcionales → null) */
export const toEtiquetaDto = (v: EtiquetaFormValues): CreateEtiquetaInput => ({
  nombre: v.nombre,
})

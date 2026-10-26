import type { DefaultValues } from 'react-hook-form'
import { z } from '@/lib/validation/zod-config'
import { createCategoriaSchema, type CreateCategoriaInput } from '@/lib/api/schemas/categoria.schema'
import type { Categoria } from '@/lib/types/categoria.types'

// Requeridos: la regla del servidor tal cual. Opcionales: aceptan '' / null / [] del form.
export const categoriaFormSchema = z.object({
  nombre: createCategoriaSchema.shape.nombre,
  descripcion: z.string().max(5000),
})

export type CategoriaFormValues = z.infer<typeof categoriaFormSchema>

export const categoriaFormDefaults = (e?: Categoria): DefaultValues<CategoriaFormValues> => ({
  nombre: e?.nombre ?? '',
  descripcion: e?.descripcion ?? '',
})

/** Valores del form → DTO de la API ('' de los opcionales → null) */
export const toCategoriaDto = (v: CategoriaFormValues): CreateCategoriaInput => ({
  nombre: v.nombre,
  descripcion: v.descripcion || null,
})

import type { DefaultValues } from 'react-hook-form'
import { z, DATE_RE } from '@/lib/validation/zod-config'
import { createPublicacionSchema, type CreatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'
import type { Publicacion } from '@/lib/types/publicacion.types'

// Requeridos: la regla del servidor tal cual. Opcionales: aceptan '' / null del form.
export const publicacionFormSchema = z.object({
  titulo: createPublicacionSchema.shape.titulo,
  resumen: z.string().max(255),
  contenido: createPublicacionSchema.shape.contenido,
  categoria_id: createPublicacionSchema.shape.categoria_id,
  publicada: createPublicacionSchema.shape.publicada,
  fecha_publicacion: z.union([z.literal(''), z.string().regex(DATE_RE, 'Fecha inválida (AAAA-MM-DD)')]),
})

export type PublicacionFormValues = z.infer<typeof publicacionFormSchema>

export const publicacionFormDefaults = (e?: Publicacion): DefaultValues<PublicacionFormValues> => ({
  titulo: e?.titulo ?? '',
  resumen: e?.resumen ?? '',
  contenido: e?.contenido ?? '',
  categoria_id: e?.categoria_id,
  publicada: e?.publicada ?? false,
  fecha_publicacion: e?.fecha_publicacion ?? '',
})

/** Valores del form → DTO de la API ('' de los opcionales → null) */
export const toPublicacionDto = (v: PublicacionFormValues): CreatePublicacionInput => ({
  titulo: v.titulo,
  resumen: v.resumen || null,
  contenido: v.contenido,
  categoria_id: v.categoria_id,
  publicada: v.publicada,
  fecha_publicacion: v.fecha_publicacion || null,
})

import { z } from '@/lib/validation/zod-config'

export const comentarioSchema = z.object({
  contenido: z.string().trim().min(1, 'Escribe un comentario').max(2000),
})

/** 1 = a favor, -1 = en contra, 0 = quitar el voto */
export const votoSchema = z.object({
  valor: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
})

export type ComentarioInput = z.infer<typeof comentarioSchema>
export type VotoInput = z.infer<typeof votoSchema>

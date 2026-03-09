import { z } from 'zod'

export const createPermissionSchema = z.object({
  name:        z.string().min(1).max(100).regex(/^[a-z_.]+$/, 'Formato esperado: recurso.accion'),
  description: z.string().max(255).nullish(),
  guard_name:  z.string().max(50).optional(),
})

export const updatePermissionSchema = createPermissionSchema.partial()

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>

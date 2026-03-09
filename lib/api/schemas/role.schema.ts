import { z } from 'zod'

export const createRoleSchema = z.object({
  name:           z.string().min(1).max(50).regex(/^[a-z_]+$/, 'Solo minúsculas y guiones bajos'),
  description:    z.string().max(255).nullish(),
  guard_name:     z.string().max(50).optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
})

export const updateRoleSchema = createRoleSchema.partial()

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

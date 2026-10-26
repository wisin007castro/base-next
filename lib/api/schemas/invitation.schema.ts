import { z } from '@/lib/validation/zod-config'
import { createUserSchema } from './user.schema'

export const createInvitationSchema = z.object({
  email: z
    .email()
    .max(255)
    .transform(e => e.trim().toLowerCase()),
  role_ids: z.array(z.number().int().positive()).default([]),
})

/** Lo que escribe la persona invitada (mismas reglas que el alta de usuarios) */
const accountFields = z.object({
  username: createUserSchema.shape.username,
  password: createUserSchema.shape.password,
  password_confirmation: z.string(),
})

const passwordsMatch = (d: { password: string; password_confirmation: string }) =>
  d.password === d.password_confirmation
const mismatch = { message: 'Las contraseñas no coinciden', path: ['password_confirmation'] }

/** Formulario de /invitacion (sin el token, que va en la URL) */
export const acceptInvitationFormSchema = accountFields.refine(passwordsMatch, mismatch)

/** Body de POST /api/invitations/accept */
export const acceptInvitationSchema = accountFields
  .extend({ token: z.string().min(1) })
  .refine(passwordsMatch, mismatch)

export type CreateInvitationInput = z.input<typeof createInvitationSchema>
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationFormSchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>

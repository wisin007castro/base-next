import { describe, expect, it } from 'vitest'
import { privilegeSchema, expiresAtFromDate } from './privilege.schema'
import { acceptInvitationSchema, createInvitationSchema } from './invitation.schema'
import { updateMeSchema } from './user.schema'

describe('privilegeSchema', () => {
  const base = { permission_id: 1, effect: 'grant' as const }

  it('vacíos → null', () => {
    expect(privilegeSchema.parse({ ...base, reason: '', expires_on: '' })).toMatchObject({
      reason: null,
      expires_on: null,
    })
  })

  it('rechaza fechas pasadas y acepta hoy', () => {
    expect(privilegeSchema.safeParse({ ...base, expires_on: '2000-01-01' }).success).toBe(false)
    const today = new Date().toISOString().slice(0, 10)
    expect(privilegeSchema.safeParse({ ...base, expires_on: today }).success).toBe(true)
  })

  it('caduca al final del día', () => {
    expect(expiresAtFromDate('2030-05-01')).toBe('2030-05-01T23:59:59.999Z')
    expect(expiresAtFromDate(null)).toBeNull()
  })
})

describe('invitaciones', () => {
  it('normaliza el correo', () => {
    expect(createInvitationSchema.parse({ email: 'Ana@Ejemplo.COM' }).email).toBe('ana@ejemplo.com')
  })

  it('las contraseñas deben coincidir', () => {
    const r = acceptInvitationSchema.safeParse({
      token: 't',
      username: 'ana',
      password: 'secreta123',
      password_confirmation: 'otra12345',
    })
    expect(r.success).toBe(false)
    expect(r.error?.flatten().fieldErrors).toHaveProperty('password_confirmation')
  })
})

describe('updateMeSchema (PATCH /api/me)', () => {
  it('ignora is_active y role_ids (no puede cambiárselos uno mismo)', () => {
    const r = updateMeSchema.parse({ username: 'ana', is_active: false, role_ids: [1] } as Record<string, unknown>)
    expect(r).not.toHaveProperty('is_active')
    expect(r).not.toHaveProperty('role_ids')
  })
})

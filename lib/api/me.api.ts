import type { User } from '@/lib/types/user.types'
import type { DisableTwoFactorInput, EnableTwoFactorInput } from '@/lib/api/schemas/user.schema'
import { request } from './http'

export interface ActiveSession {
  id: number
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  isCurrent: boolean
}

export type MeUser = User & { twoFactorEnabled?: boolean }

export interface TwoFactorSetup {
  secret: string
  /** QR (data URL) para escanear con la app de autenticación */
  qrDataUrl: string
}

export const meApi = {
  /** Usuario autenticado (incluye profile y roles) */
  get: (signal?: AbortSignal) => request<MeUser>('/me', { signal }),

  /** PATCH parcial del propio usuario */
  update: (body: Record<string, unknown>) => request<MeUser>('/me', { method: 'PATCH', body: JSON.stringify(body) }),

  /** Sesiones activas */
  getSessions: (signal?: AbortSignal) => request<ActiveSession[]>('/me/sessions', { signal }),

  /** Revocar una sesión */
  revokeSession: (id: number) => request<void>(`/me/sessions/${id}`, { method: 'DELETE' }),

  /** 2FA: genera el secreto (aún sin activar) */
  setupTwoFactor: () => request<TwoFactorSetup>('/me/2fa/setup', { method: 'POST' }),

  /** 2FA: activa verificando el primer código de la app */
  enableTwoFactor: (dto: EnableTwoFactorInput) =>
    request<void>('/me/2fa/enable', { method: 'POST', body: JSON.stringify(dto) }),

  /** 2FA: desactiva con la contraseña actual */
  disableTwoFactor: (dto: DisableTwoFactorInput) =>
    request<void>('/me/2fa/disable', { method: 'POST', body: JSON.stringify(dto) }),
}

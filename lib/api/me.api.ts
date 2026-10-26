import type { User } from '@/lib/types/user.types'
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

export const meApi = {
  /** Usuario autenticado (incluye profile y roles) */
  get: (signal?: AbortSignal) => request<MeUser>('/me', { signal }),

  /** PATCH parcial del propio usuario */
  update: (body: Record<string, unknown>) => request<MeUser>('/me', { method: 'PATCH', body: JSON.stringify(body) }),

  /** Sesiones activas */
  getSessions: (signal?: AbortSignal) => request<ActiveSession[]>('/me/sessions', { signal }),

  /** Revocar una sesión */
  revokeSession: (id: number) => request<void>(`/me/sessions/${id}`, { method: 'DELETE' }),
}

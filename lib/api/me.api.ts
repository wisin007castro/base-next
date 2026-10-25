import type { User } from '@/lib/types/user.types'
import { request } from './http'

export interface ActiveSession {
  id: string
  userAgent: string | null
  device: string | null
  createdAt: string
  lastAccessAt: string | null
  expiresAt: string | null
  isCurrent?: boolean
}

export type MeUser = User & { twoFactorEnabled?: boolean }

export const meApi = {
  /** Usuario autenticado (incluye profile y roles) */
  get: (signal?: AbortSignal) => request<MeUser>('/me', { signal }),

  /**
   * PATCH parcial del propio usuario.
   * Lanza el body de error crudo: el perfil interpreta `errors` / `field` a su manera.
   */
  update: async (body: Record<string, unknown>) => {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw data
    }
    return res.json() as Promise<MeUser>
  },

  /** Sesiones activas */
  getSessions: (signal?: AbortSignal) => request<ActiveSession[]>('/me/sessions', { signal }),

  /** Revocar una sesión */
  revokeSession: (id: string) => request<void>(`/me/sessions/${id}`, { method: 'DELETE' }),
}

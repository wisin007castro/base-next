import type { AccessSettings, MailSettingsInput, MailSettingsView, SystemSettings } from '@/lib/settings/schemas'
import { request } from './http'

export interface PublicSettings {
  systemName: string
  logoUrl: string
  loginCodeEnabled: boolean
}

const put = <T>(section: string, body: unknown) =>
  request<T>(`/settings/${section}`, { method: 'PUT', body: JSON.stringify(body) })

export const settingsApi = {
  getPublic: (signal?: AbortSignal) => request<PublicSettings>('/settings/public', { signal }),

  getSystem: (signal?: AbortSignal) => request<SystemSettings>('/settings/system', { signal }),
  saveSystem: (dto: SystemSettings) => put<SystemSettings>('system', dto),

  getAccess: (signal?: AbortSignal) => request<AccessSettings>('/settings/access', { signal }),
  saveAccess: (dto: AccessSettings) => put<AccessSettings>('access', dto),

  getMail: (signal?: AbortSignal) => request<MailSettingsView>('/settings/mail', { signal }),
  saveMail: (dto: MailSettingsInput) => put<MailSettingsView>('mail', dto),
  testMail: (to: string) =>
    request<{ message: string }>('/settings/mail/test', { method: 'POST', body: JSON.stringify({ to }) }),
}

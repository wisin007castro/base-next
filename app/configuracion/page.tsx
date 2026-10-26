'use client'
import { AccessSettingsForm, MailSettingsForm, SystemSettingsForm } from '@/app/components/settings/SettingsForms'

export default function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Configuración</h1>
        <p className="mt-0.5 text-sm text-ink-3">Ajustes del sistema guardados en la base de datos.</p>
      </div>
      <SystemSettingsForm />
      <AccessSettingsForm />
      <MailSettingsForm />
    </div>
  )
}

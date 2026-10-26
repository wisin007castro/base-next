'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from '@/lib/validation/zod-config'
import {
  accessSettingsSchema,
  mailSettingsInputSchema,
  systemSettingsSchema,
  type AccessSettings,
  type MailSettingsInput,
  type MailSettingsView,
  type SystemSettings,
} from '@/lib/settings/schemas'
import {
  useAccessSettings,
  useMailSettings,
  useSaveAccessSettings,
  useSaveMailSettings,
  useSaveSystemSettings,
  useSystemSettings,
  useTestMail,
} from '@/lib/hooks/settings.hooks'
import {
  FieldCheckbox,
  FieldNumber,
  FieldSelect,
  FieldText,
  Form,
  FormSection,
  FormStatus,
  SubmitButton,
} from '@/app/components/form'

const Loading = () => <p className="text-sm text-ink-3">Cargando…</p>
const Actions = ({ label = 'Guardar' }: { label?: string }) => (
  <div className="flex justify-end">
    <SubmitButton>{label}</SubmitButton>
  </div>
)

// ─── Sistema ─────────────────────────────────────────────────────────────────
export function SystemSettingsForm() {
  const { data } = useSystemSettings()
  return data ? <SystemForm initial={data} /> : <Loading />
}

function SystemForm({ initial }: { initial: SystemSettings }) {
  const save = useSaveSystemSettings()
  const form = useForm<SystemSettings>({ resolver: zodResolver(systemSettingsSchema), defaultValues: initial })
  return (
    <Form form={form} onSubmit={v => save.mutateAsync(v)} className="space-y-4">
      <FormSection title="Sistema">
        <FormStatus />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={form.control} name="systemName" label="Nombre del sistema" required />
          <FieldText
            control={form.control}
            name="logoUrl"
            type="url"
            label="URL del logo"
            placeholder="https://…/logo.png"
            hint="Opcional. Se muestra en el menú y en los correos (URL absoluta)."
          />
        </div>
        <Actions />
      </FormSection>
    </Form>
  )
}

// ─── Acceso ──────────────────────────────────────────────────────────────────
const policyOptions = [
  { value: 'off', label: 'Opcional (cada usuario decide)' },
  { value: 'admins', label: 'Obligatorio para administradores' },
  { value: 'everyone', label: 'Obligatorio para todos' },
] as const

export function AccessSettingsForm() {
  const { data } = useAccessSettings()
  return data ? <AccessForm initial={data} /> : <Loading />
}

function AccessForm({ initial }: { initial: AccessSettings }) {
  const save = useSaveAccessSettings()
  const form = useForm<AccessSettings>({
    resolver: zodResolver(accessSettingsSchema),
    defaultValues: initial,
  })
  return (
    <Form form={form} onSubmit={v => save.mutateAsync(v)} className="space-y-4">
      <FormSection title="Acceso">
        <FormStatus />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldSelect
            control={form.control}
            name="twoFactorPolicy"
            label="Verificación en dos pasos (2FA)"
            options={policyOptions}
          />
          <FieldNumber
            control={form.control}
            name="invitationDays"
            label="Días de validez de una invitación"
            min={1}
            max={90}
            required
          />
          <FieldCheckbox
            control={form.control}
            name="loginCodeEnabled"
            label="Permitir iniciar sesión con un código enviado por correo"
            hint="Sin contraseña. Si el usuario tiene 2FA, también se le pide."
          />
          <FieldNumber
            control={form.control}
            name="loginCodeMinutes"
            label="Minutos de validez del código"
            min={1}
            max={60}
            required
          />
        </div>
        <p className="text-xs text-ink-3">
          Con 2FA obligatorio, quien no lo tenga activo solo podrá entrar a configurarlo hasta activarlo.
        </p>
        <Actions />
      </FormSection>
    </Form>
  )
}

// ─── Correo ──────────────────────────────────────────────────────────────────
const sourceOptions = [
  { value: 'env', label: 'Variables de entorno (MAIL_* en .env)' },
  { value: 'database', label: 'Configurado aquí' },
] as const

export function MailSettingsForm() {
  const { data } = useMailSettings()
  return data ? <MailForm initial={data} /> : <Loading />
}

function MailForm({ initial }: { initial: MailSettingsView }) {
  const save = useSaveMailSettings()
  const { hasPassword, ...values } = initial
  const form = useForm<MailSettingsInput>({
    resolver: zodResolver(mailSettingsInputSchema),
    defaultValues: { ...values, pass: '', clearPass: false },
  })
  const fromDb = form.watch('source') === 'database'

  return (
    <div className="space-y-4">
      <Form
        form={form}
        onSubmit={async v => {
          await save.mutateAsync(v)
          form.reset({ ...v, pass: '', clearPass: false })
        }}
        className="space-y-4"
      >
        <FormSection title="Correo (SMTP)">
          <FormStatus />
          <FieldSelect
            control={form.control}
            name="source"
            label="Origen de la configuración"
            options={sourceOptions}
          />
          {fromDb && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldText control={form.control} name="host" label="Servidor" placeholder="smtp.ejemplo.com" required />
              <FieldNumber control={form.control} name="port" label="Puerto" min={1} max={65535} required />
              <FieldText control={form.control} name="user" label="Usuario" autoComplete="off" />
              <FieldText
                control={form.control}
                name="pass"
                type="password"
                label="Contraseña"
                autoComplete="new-password"
                placeholder={hasPassword ? '•••••••• (guardada; vacío = no cambiar)' : ''}
                hint="Se guarda cifrada"
              />
              <FieldText
                control={form.control}
                name="from"
                label="Remitente"
                placeholder="Sistema <noreply@ejemplo.com>"
                required
              />
              <div className="space-y-3 pt-6">
                <FieldCheckbox control={form.control} name="secure" label="Conexión TLS directa (puerto 465)" />
                {hasPassword && (
                  <FieldCheckbox control={form.control} name="clearPass" label="Borrar la contraseña guardada" />
                )}
              </div>
            </div>
          )}
          <Actions />
        </FormSection>
      </Form>
      <TestMailForm />
    </div>
  )
}

const testSchema = z.object({ to: z.email() })

function TestMailForm() {
  const test = useTestMail()
  const form = useForm<z.infer<typeof testSchema>>({ resolver: zodResolver(testSchema), defaultValues: { to: '' } })
  return (
    <Form form={form} onSubmit={v => test.mutateAsync(v.to)} className="space-y-3">
      <FormSection title="Probar la configuración guardada">
        <FormStatus success={test.data?.message} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FieldText control={form.control} name="to" type="email" label="Enviar a" className="flex-1" required />
          <SubmitButton pendingText="Enviando...">Enviar correo de prueba</SubmitButton>
        </div>
      </FormSection>
    </Form>
  )
}

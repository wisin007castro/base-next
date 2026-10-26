'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { MeUser } from '@/lib/api/me.api'
import {
  disableTwoFactorSchema,
  enableTwoFactorSchema,
  type DisableTwoFactorInput,
  type EnableTwoFactorInput,
} from '@/lib/api/schemas/user.schema'
import { useDisableTwoFactor, useEnableTwoFactor, useSetupTwoFactor } from '@/lib/hooks/me.hooks'
import { FieldText, Form, FormStatus, SubmitButton } from '@/app/components/form'

/** Activar / desactivar 2FA (perfil y /configurar-2fa) */

const secondaryBtnClass =
  'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'

const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass =
  'text-xs font-semibold uppercase tracking-wider text-accent border-b border-[var(--line-2)] pb-2 mb-4'

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const classes =
    type === 'success'
      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  return <div className={`rounded-lg px-4 py-3 text-sm ${classes}`}>{message}</div>
}

function EnableTwoFactorForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const enable = useEnableTwoFactor()
  const form = useForm<EnableTwoFactorInput>({
    resolver: zodResolver(enableTwoFactorSchema),
    defaultValues: { code: '' },
  })

  return (
    <Form
      form={form}
      onSubmit={async values => {
        await enable.mutateAsync(values)
        onDone()
      }}
      className="space-y-3"
    >
      <FormStatus />
      <FieldText
        control={form.control}
        name="code"
        label="Código de verificación"
        placeholder="123456"
        autoComplete="one-time-code"
        required
      />
      <div className="flex gap-2">
        <SubmitButton pendingText="Verificando...">Activar 2FA</SubmitButton>
        <button type="button" onClick={onCancel} className={secondaryBtnClass}>
          Cancelar
        </button>
      </div>
    </Form>
  )
}

function DisableTwoFactorForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const disable = useDisableTwoFactor()
  const form = useForm<DisableTwoFactorInput>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: { password: '' },
  })

  return (
    <Form
      form={form}
      onSubmit={async values => {
        await disable.mutateAsync(values)
        onDone()
      }}
      className="max-w-sm space-y-3"
    >
      <FormStatus />
      <FieldText
        control={form.control}
        name="password"
        type="password"
        label="Contraseña actual"
        autoComplete="current-password"
        required
      />
      <div className="flex gap-2">
        <SubmitButton pendingText="Desactivando...">Confirmar desactivación</SubmitButton>
        <button type="button" onClick={onCancel} className={secondaryBtnClass}>
          Cancelar
        </button>
      </div>
    </Form>
  )
}

export function TwoFactorSection({
  user,
  onEnabled,
  canDisable = true,
}: {
  user: MeUser
  /** Tras activar (p. ej. refrescar la sesión en /configurar-2fa) */
  onEnabled?: () => void
  /** false si la política obliga a tenerlo */
  canDisable?: boolean
}) {
  // El estado activo sale de la caché de `me` (las mutaciones la actualizan)
  const enabled = !!user.twoFactorEnabled
  const setup = useSetupTwoFactor()
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const startSetup = () => {
    setNotice(null)
    setup.mutate()
  }

  return (
    <div className={sectionClass}>
      <p className={sectionTitleClass}>Autenticación de dos factores (2FA)</p>

      {notice && <Alert type="success" message={notice} />}
      {setup.isError && <Alert type="error" message={setup.error.message} />}

      {enabled ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              2FA activo
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu cuenta está protegida con autenticación de dos factores.
            </p>
          </div>

          {!canDisable ? (
            <p className="text-xs text-ink-3">La configuración del sistema obliga a mantener 2FA activo.</p>
          ) : showDisableForm ? (
            <DisableTwoFactorForm
              onCancel={() => setShowDisableForm(false)}
              onDone={() => {
                setShowDisableForm(false)
                setNotice('2FA desactivado')
              }}
            />
          ) : (
            <button
              onClick={() => {
                setShowDisableForm(true)
                setNotice(null)
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Desactivar 2FA
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Añade una capa adicional de seguridad a tu cuenta con una aplicación de autenticación (Google Authenticator,
            Authy, etc.).
          </p>

          {!setup.data ? (
            <button
              onClick={startSetup}
              disabled={setup.isPending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
            >
              {setup.isPending ? 'Iniciando...' : 'Configurar 2FA'}
            </button>
          ) : (
            <div className="flex flex-col items-start gap-6 sm:flex-row">
              <div className="shrink-0">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Escanea con tu app de autenticación
                </p>
                <div className="inline-block rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.data.qrDataUrl} alt="QR Code para 2FA" width={160} height={160} className="block" />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    O introduce el código manualmente
                  </p>
                  <code className="block select-all break-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    {setup.data.secret}
                  </code>
                </div>
                <EnableTwoFactorForm
                  onCancel={() => setup.reset()}
                  onDone={() => {
                    setup.reset()
                    setNotice('2FA activado correctamente')
                    onEnabled?.()
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

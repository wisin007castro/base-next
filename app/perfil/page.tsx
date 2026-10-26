'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { User } from '@/lib/types/user.types'
import type { ActiveSession } from '@/lib/api/me.api'
import { useMe, useUpdateMe, useSetMe, useInvalidateMe, useMySessions, useRevokeSession } from '@/lib/hooks/me.hooks'
import AvatarUpload from '@/app/components/users/AvatarUpload'
import { FieldText, Form, FormSection, FormStatus, SubmitButton } from '@/app/components/form'
import { PersonalDataFields } from '@/app/components/users/UserFields'
import {
  myAccountDefaults,
  myAccountFormSchema,
  personalDataDefaults,
  personalDataFormSchema,
  toMyAccountDto,
  toProfileDto,
  type MyAccountFormValues,
  type PersonalDataFormValues,
} from '@/lib/forms/user.form'

const inputClass = 'field-input'

const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass =
  'text-xs font-semibold uppercase tracking-wider text-accent border-b border-[var(--line-2)] pb-2 mb-4'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const classes =
    type === 'success'
      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  return <div className={`rounded-lg px-4 py-3 text-sm ${classes}`}>{message}</div>
}

// ---------------------------------------------------------------------------
// Sección: Datos de cuenta
// ---------------------------------------------------------------------------
function AccountSection({ user }: { user: User }) {
  const updateMe = useUpdateMe()
  const form = useForm<MyAccountFormValues>({
    resolver: zodResolver(myAccountFormSchema),
    defaultValues: myAccountDefaults(user),
  })
  const { control } = form
  const password = form.watch('password')

  async function handleSubmit(values: MyAccountFormValues) {
    await updateMe.mutateAsync(toMyAccountDto(values))
    form.reset(
      { ...values, password: '', password_confirmation: '', current_password: '' },
      { keepIsSubmitSuccessful: true },
    )
  }

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <FormSection title="Datos de cuenta">
        <FormStatus success="Datos de cuenta actualizados" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText control={control} name="username" label="Username" required />
          <FieldText control={control} name="email" type="email" label="Correo electrónico" required />
          <FieldText
            control={control}
            name="password"
            type="password"
            label="Nueva contraseña"
            placeholder="Dejar vacío para no cambiar"
            autoComplete="new-password"
          />
          <FieldText
            control={control}
            name="password_confirmation"
            type="password"
            label="Confirmar contraseña"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {password && (
            <FieldText
              control={control}
              name="current_password"
              type="password"
              label="Contraseña actual"
              required
              autoComplete="current-password"
              className="sm:col-span-2"
            />
          )}
        </div>
        <div className="flex justify-end pt-1">
          <SubmitButton>Actualizar cuenta</SubmitButton>
        </div>
      </FormSection>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Sección: Datos personales
// ---------------------------------------------------------------------------
function PersonalSection({ user }: { user: User }) {
  const updateMe = useUpdateMe()
  const form = useForm<PersonalDataFormValues>({
    resolver: zodResolver(personalDataFormSchema),
    defaultValues: personalDataDefaults(user.profile),
  })

  return (
    <Form
      form={form}
      onSubmit={values => updateMe.mutateAsync({ profile: toProfileDto(values) })}
      className="space-y-4"
    >
      <FormStatus success="Datos personales actualizados" />
      <PersonalDataFields />
      <div className="flex justify-end">
        <SubmitButton>Actualizar datos personales</SubmitButton>
      </div>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Sección B: Sesiones activas
// ---------------------------------------------------------------------------
function SessionsSection() {
  const { data: sessions = [], isPending: loading, error: loadError } = useMySessions()
  const revoke = useRevokeSession()

  const error = loadError ? 'No se pudieron cargar las sesiones' : (revoke.error?.message ?? null)
  const revokingId = revoke.isPending ? revoke.variables : null

  function revokeSession(id: number) {
    // Calcularlo antes: onSuccess quita la sesión de la caché
    const isCurrentSession = sessions.find(s => s.id === id)?.isCurrent
    revoke.mutate(id, {
      onSuccess: () => {
        if (isCurrentSession) signOut({ callbackUrl: '/login' })
      },
    })
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getDeviceLabel(session: ActiveSession) {
    if (!session.userAgent) return 'Dispositivo desconocido'
    // Simple UA parse
    const ua = session.userAgent
    if (/mobile/i.test(ua)) return 'Móvil'
    if (/tablet/i.test(ua)) return 'Tablet'
    return 'Escritorio'
  }

  function getBrowserLabel(session: ActiveSession) {
    const ua = session.userAgent ?? ''
    if (/Edg\//i.test(ua)) return 'Edge'
    if (/Chrome\//i.test(ua)) return 'Chrome'
    if (/Firefox\//i.test(ua)) return 'Firefox'
    if (/Safari\//i.test(ua)) return 'Safari'
    return ua.slice(0, 40) || '—'
  }

  return (
    <div className={sectionClass}>
      <p className={sectionTitleClass}>Sesiones activas</p>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando sesiones...</p>}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay sesiones activas.</p>
      )}

      {!loading && sessions.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {sessions.map(session => {
            const isCurrent = session.isCurrent
            return (
              <li key={session.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {getDeviceLabel(session)}
                    </span>
                    <span className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">
                      {getBrowserLabel(session)}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        Sesión actual
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>Creada: {formatDate(session.createdAt)}</span>
                    {session.lastUsedAt && <span>Último acceso: {formatDate(session.lastUsedAt)}</span>}
                    {session.expiresAt && <span>Expira: {formatDate(session.expiresAt)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revokingId === session.id}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {revokingId === session.id ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sección C: Autenticación de dos factores (2FA)
// ---------------------------------------------------------------------------
interface TwoFactorSetupData {
  secret: string
  qrDataUrl: string
}

function TwoFactorSection({ user }: { user: User & { twoFactorEnabled?: boolean } }) {
  const invalidateMe = useInvalidateMe()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(
    (user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false,
  )
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSetup() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/me/2fa/setup', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Error al iniciar configuración 2FA')
      }
      const data: TwoFactorSetupData = await res.json()
      setSetupData(data)
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al configurar 2FA' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) {
      setStatus({ type: 'error', msg: 'Introduce el código OTP' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/me/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Código incorrecto')
      }
      setTwoFactorEnabled(true)
      invalidateMe()
      setSetupData(null)
      setOtpCode('')
      setStatus({ type: 'success', msg: '2FA activado correctamente' })
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al activar 2FA' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    if (!disablePassword.trim()) {
      setStatus({ type: 'error', msg: 'Introduce tu contraseña actual' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/me/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Contraseña incorrecta')
      }
      setTwoFactorEnabled(false)
      invalidateMe()
      setShowDisableForm(false)
      setDisablePassword('')
      setStatus({ type: 'success', msg: '2FA desactivado' })
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al desactivar 2FA' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={sectionClass}>
      <p className={sectionTitleClass}>Autenticación de dos factores (2FA)</p>

      {status && <Alert type={status.type} message={status.msg} />}

      {twoFactorEnabled ? (
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

          {!showDisableForm ? (
            <button
              onClick={() => {
                setShowDisableForm(true)
                setStatus(null)
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Desactivar 2FA
            </button>
          ) : (
            <form onSubmit={handleDisable} className="max-w-sm space-y-3">
              <Field label="Contraseña actual *">
                <input
                  className={inputClass}
                  type="password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  placeholder="Introduce tu contraseña para desactivar 2FA"
                  required
                  autoFocus
                />
              </Field>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {loading ? 'Desactivando...' : 'Confirmar desactivación'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableForm(false)
                    setDisablePassword('')
                    setStatus(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Añade una capa adicional de seguridad a tu cuenta con una aplicación de autenticación (Google Authenticator,
            Authy, etc.).
          </p>

          {!setupData ? (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? 'Iniciando...' : 'Configurar 2FA'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-start gap-6 sm:flex-row">
                {/* QR Code */}
                <div className="shrink-0">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Escanea con tu app de autenticación
                  </p>
                  <div className="inline-block rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={setupData.qrDataUrl} alt="QR Code para 2FA" width={160} height={160} className="block" />
                  </div>
                </div>

                {/* Secret + OTP form */}
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      O introduce el código manualmente
                    </p>
                    <code className="block select-all break-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {setupData.secret}
                    </code>
                  </div>

                  <form onSubmit={handleEnable} className="space-y-3">
                    <Field label="Código OTP de verificación *">
                      <input
                        className={inputClass}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        required
                        autoComplete="one-time-code"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                      >
                        {loading ? 'Verificando...' : 'Activar 2FA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSetupData(null)
                          setOtpCode('')
                          setStatus(null)
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function PerfilPage() {
  const { data: user, isPending } = useMe()
  const setMe = useSetMe()

  if (isPending) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando perfil...</div>
  }

  if (!user) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20">
        No se pudo cargar el perfil.
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Gestiona tu información personal y de cuenta</p>
      </div>

      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={user.profile?.avatar_url}
          uploadUrl="/api/upload/avatar"
          onUploaded={result =>
            setMe(u => ({
              ...u,
              profile: u.profile
                ? { ...u.profile, avatar_url: result.avatar_url, avatar_thumb_url: result.avatar_thumb_url }
                : u.profile,
            }))
          }
        />
      </div>

      <AccountSection user={user} />
      <PersonalSection user={user} />
      <SessionsSection />
      <TwoFactorSection user={user} />
    </div>
  )
}

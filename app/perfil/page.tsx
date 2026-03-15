'use client'
import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import type { User, DocumentType, Gender } from '@/lib/types/user.types'
import AvatarUpload from '@/app/components/users/AvatarUpload'

const inputClass = 'field-input'

const selectClass = inputClass
const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wider text-accent border-b border-[var(--line-2)] pb-2 mb-4'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const classes = type === 'success'
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${classes}`}>{message}</div>
  )
}

async function patchMe(body: Record<string, unknown>) {
  const res = await fetch('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw data
  }
  return res.json() as Promise<User>
}

// ---------------------------------------------------------------------------
// Sección: Datos de cuenta
// ---------------------------------------------------------------------------
function AccountSection({ user }: { user: User }) {
  const [username, setUsername]             = useState(user.username)
  const [email, setEmail]                   = useState(user.email)
  const [password, setPassword]             = useState('')
  const [passwordConf, setPasswordConf]     = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving]                 = useState(false)
  const [status, setStatus]                 = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [fieldErrors, setFieldErrors]       = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password && password !== passwordConf) {
      setStatus({ type: 'error', msg: 'Las contraseñas no coinciden' })
      return
    }
    setSaving(true)
    setStatus(null)
    setFieldErrors({})
    const body: Record<string, unknown> = { username, email }
    if (password) {
      body.password = password
      body.current_password = currentPassword
    }
    try {
      await patchMe(body)
      setStatus({ type: 'success', msg: 'Datos de cuenta actualizados' })
      setPassword('')
      setPasswordConf('')
      setCurrentPassword('')
    } catch (err: unknown) {
      const errData = err as Record<string, unknown>
      if (errData && typeof errData === 'object') {
        // Check for field-level errors
        const errors: Record<string, string> = {}
        if (errData.errors && typeof errData.errors === 'object') {
          const rawErrors = errData.errors as Record<string, unknown>
          for (const key of Object.keys(rawErrors)) {
            const val = rawErrors[key]
            errors[key] = Array.isArray(val) ? String(val[0]) : String(val)
          }
        }
        if (errData.field === 'current_password' || errors.current_password) {
          errors.current_password = errors.current_password ?? (errData.message as string) ?? 'Contraseña actual incorrecta'
        }
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors)
          setStatus(null)
        } else {
          setStatus({ type: 'error', msg: (errData.message as string) ?? 'Error al guardar' })
        }
      } else {
        setStatus({ type: 'error', msg: 'Error al guardar' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos de cuenta</p>
        {status && <Alert type={status.type} message={status.msg} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username *">
            <input className={inputClass} value={username} onChange={e => setUsername(e.target.value)} required />
          </Field>
          <Field label="Correo electrónico *">
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Field>
          <Field label="Nueva contraseña">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
            />
          </Field>
          <Field label="Confirmar contraseña">
            <input
              className={inputClass}
              type="password"
              value={passwordConf}
              onChange={e => setPasswordConf(e.target.value)}
              placeholder="••••••••"
              required={!!password}
            />
          </Field>
          {password && (
            <div className="sm:col-span-2">
              <Field label="Contraseña actual *">
                <input
                  className={
                    inputClass +
                    (fieldErrors.current_password
                      ? ' !border-red-400 focus:!border-red-400 focus:!ring-red-200'
                      : '')
                  }
                  type="password"
                  value={currentPassword}
                  onChange={e => {
                    setCurrentPassword(e.target.value)
                    if (fieldErrors.current_password) {
                      setFieldErrors(prev => { const next = { ...prev }; delete next.current_password; return next })
                    }
                  }}
                  placeholder="Introduce tu contraseña actual para confirmar"
                  required={!!password}
                />
                {fieldErrors.current_password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.current_password}</p>
                )}
              </Field>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando...' : 'Actualizar cuenta'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sección: Datos personales, contacto y dirección
// ---------------------------------------------------------------------------
function PersonalSection({ user }: { user: User }) {
  const p = user.profile

  const [nombre, setNombre]                   = useState(p?.nombre ?? '')
  const [primerApellido, setPrimerApellido]   = useState(p?.primer_apellido ?? '')
  const [segundoApellido, setSegundoApellido] = useState(p?.segundo_apellido ?? '')
  const [tipoDocumento, setTipoDocumento]     = useState<DocumentType>(p?.tipo_documento ?? 'dni')
  const [numeroDocumento, setNumeroDocumento] = useState(p?.numero_documento ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(p?.fecha_nacimiento ?? '')
  const [genero, setGenero]                   = useState<Gender>(p?.genero ?? 'prefiero_no_decir')
  const [telefono, setTelefono]               = useState(p?.telefono ?? '')
  const [telefonoAlt, setTelefonoAlt]         = useState(p?.telefono_alternativo ?? '')
  const [pais, setPais]                       = useState(p?.pais ?? '')
  const [departamento, setDepartamento]       = useState(p?.departamento ?? '')
  const [ciudad, setCiudad]                   = useState(p?.ciudad ?? '')
  const [direccion, setDireccion]             = useState(p?.direccion ?? '')
  const [codigoPostal, setCodigoPostal]       = useState(p?.codigo_postal ?? '')

  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await patchMe({
        profile: {
          nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido || null,
          tipo_documento: tipoDocumento, numero_documento: numeroDocumento,
          fecha_nacimiento: fechaNacimiento, genero,
          telefono: telefono || null, telefono_alternativo: telefonoAlt || null,
          pais: pais || null, departamento: departamento || null, ciudad: ciudad || null,
          direccion: direccion || null, codigo_postal: codigoPostal || null,
        },
      })
      setStatus({ type: 'success', msg: 'Datos personales actualizados' })
    } catch (err: unknown) {
      const errData = err as Record<string, unknown>
      setStatus({ type: 'error', msg: (errData?.message as string) ?? 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos personales */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos personales</p>
        {status && <Alert type={status.type} message={status.msg} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre *">
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </Field>
          <Field label="Primer apellido *">
            <input className={inputClass} value={primerApellido} onChange={e => setPrimerApellido(e.target.value)} required />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputClass} value={segundoApellido} onChange={e => setSegundoApellido(e.target.value)} />
          </Field>
          <Field label="Tipo de documento *">
            <select className={selectClass} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value as DocumentType)}>
              <option value="dni">DNI</option>
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="nie">NIE</option>
            </select>
          </Field>
          <Field label="Número de documento *">
            <input className={inputClass} value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} required />
          </Field>
          <Field label="Fecha de nacimiento *">
            <input className={inputClass} type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required />
          </Field>
          <Field label="Género">
            <select className={selectClass} value={genero} onChange={e => setGenero(e.target.value as Gender)}>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Contacto */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Contacto</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Teléfono alternativo">
            <input className={inputClass} value={telefonoAlt} onChange={e => setTelefonoAlt(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Dirección */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Dirección</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="País">
            <input className={inputClass} value={pais} onChange={e => setPais(e.target.value)} />
          </Field>
          <Field label="Departamento / Provincia">
            <input className={inputClass} value={departamento} onChange={e => setDepartamento(e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <input className={inputClass} value={ciudad} onChange={e => setCiudad(e.target.value)} />
          </Field>
          <Field label="Código postal">
            <input className={inputClass} value={codigoPostal} onChange={e => setCodigoPostal(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input className={inputClass} value={direccion} onChange={e => setDireccion(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Guardando...' : 'Actualizar datos personales'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sección B: Sesiones activas
// ---------------------------------------------------------------------------
interface ActiveSession {
  id: string
  userAgent: string | null
  device: string | null
  createdAt: string
  lastAccessAt: string | null
  expiresAt: string | null
  isCurrent?: boolean
}

function SessionsSection() {
  const { data: sessionData } = useSession()
  const [sessions, setSessions]   = useState<ActiveSession[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // The JWT jti (session id) is available on the session token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentJti = (sessionData as any)?.jti as string | undefined

  useEffect(() => {
    fetch('/api/me/sessions', { headers: { Accept: 'application/json' } })
      .then(r => {
        if (!r.ok) throw new Error('No se pudieron cargar las sesiones')
        return r.json()
      })
      .then((data: ActiveSession[]) => setSessions(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar sesiones'))
      .finally(() => setLoading(false))
  }, [])

  async function revokeSession(id: string) {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/me/sessions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Error al cerrar sesión')
      }
      // If revoking current session, sign out
      const isCurrentSession = sessions.find(s => s.id === id)?.isCurrent || id === currentJti
      setSessions(prev => prev.filter(s => s.id !== id))
      if (isCurrentSession) {
        await signOut({ callbackUrl: '/login' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesión')
    } finally {
      setRevokingId(null)
    }
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function getDeviceLabel(session: ActiveSession) {
    if (session.device) return session.device
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

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando sesiones...</p>
      )}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay sesiones activas.</p>
      )}

      {!loading && sessions.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {sessions.map(session => {
            const isCurrent = session.isCurrent || session.id === currentJti
            return (
              <li key={session.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {getDeviceLabel(session)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {getBrowserLabel(session)}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                        Sesión actual
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>Creada: {formatDate(session.createdAt)}</span>
                    {session.lastAccessAt && (
                      <span>Último acceso: {formatDate(session.lastAccessAt)}</span>
                    )}
                    {session.expiresAt && (
                      <span>Expira: {formatDate(session.expiresAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revokingId === session.id}
                  className="shrink-0 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(
    (user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false
  )
  const [setupData, setSetupData]     = useState<TwoFactorSetupData | null>(null)
  const [otpCode, setOtpCode]         = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [status, setStatus]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              2FA activo
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu cuenta está protegida con autenticación de dos factores.
            </p>
          </div>

          {!showDisableForm ? (
            <button
              onClick={() => { setShowDisableForm(true); setStatus(null) }}
              className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Desactivar 2FA
            </button>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3 max-w-sm">
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
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Desactivando...' : 'Confirmar desactivación'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisableForm(false); setDisablePassword(''); setStatus(null) }}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
            Añade una capa adicional de seguridad a tu cuenta con una aplicación de autenticación (Google Authenticator, Authy, etc.).
          </p>

          {!setupData ? (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Iniciando...' : 'Configurar 2FA'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* QR Code */}
                <div className="shrink-0">
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Escanea con tu app de autenticación
                  </p>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setupData.qrDataUrl}
                      alt="QR Code para 2FA"
                      width={160}
                      height={160}
                      className="block"
                    />
                  </div>
                </div>

                {/* Secret + OTP form */}
                <div className="flex-1 space-y-4 min-w-0">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      O introduce el código manualmente
                    </p>
                    <code className="block rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 break-all select-all">
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
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        {loading ? 'Verificando...' : 'Activar 2FA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSetupData(null); setOtpCode(''); setStatus(null) }}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((u: User) => setUser(u))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando perfil...</div>
  }

  if (!user) {
    return <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600">No se pudo cargar el perfil.</div>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Gestiona tu información personal y de cuenta</p>
      </div>

      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={user.profile?.avatar_url}
          uploadUrl="/api/upload/avatar"
          onUploaded={(result) => setUser(u => u ? { ...u, profile: u.profile ? { ...u.profile, avatar_url: result.avatar_url, avatar_thumb_url: result.avatar_thumb_url } : u.profile } : u)}
        />
      </div>

      <AccountSection user={user} />
      <PersonalSection user={user} />
      <SessionsSection />
      <TwoFactorSection user={user} />
    </div>
  )
}

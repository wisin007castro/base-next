'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { usePublicSettings } from '@/lib/hooks/settings.hooks'

type Mode = 'password' | 'code'

const inputClass = 'field-input'
const primaryBtn =
  'w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60'
const linkBtn = 'text-sm text-sky-600 hover:underline dark:text-sky-400'

/** signIn sin redirección → mensaje de error para el usuario, o null si entró */
async function trySignIn(provider: 'credentials' | 'login-code', data: Record<string, string>, wrong: string) {
  let res: Awaited<ReturnType<typeof signIn>>
  try {
    res = await signIn(provider, { ...data, redirect: false })
  } catch {
    // El servidor respondió con algo que no es JSON (500, caída) o no hubo red
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }
  if (!res || res.error) {
    return res?.code === 'rate_limited' ? 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' : wrong
  }
  // Hard reload para que el layout relea la sesión del servidor
  window.location.replace('/')
  return null
}

export default function LoginPage() {
  const { data: settings } = usePublicSettings()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const switchTo = (m: Mode) => {
    setMode(m)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Iniciar sesión</h1>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {mode === 'password' ? (
          <PasswordForm email={email} setEmail={setEmail} setError={setError} />
        ) : (
          <CodeForm email={email} setEmail={setEmail} setError={setError} />
        )}

        <div className="mt-4 flex flex-col items-center gap-2">
          {settings?.loginCodeEnabled &&
            (mode === 'password' ? (
              <button type="button" className={linkBtn} onClick={() => switchTo('code')}>
                Entrar con un código por correo
              </button>
            ) : (
              <button type="button" className={linkBtn} onClick={() => switchTo('password')}>
                Entrar con contraseña
              </button>
            ))}
          {mode === 'password' && (
            <Link href="/forgot-password" className={linkBtn}>
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

interface StepProps {
  email: string
  setEmail: (v: string) => void
  setError: (v: string) => void
}

function EmailField({
  email,
  setEmail,
  disabled,
}: {
  email: string
  setEmail: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label htmlFor="email" className="field-label">
        Correo electrónico
      </label>
      <input
        id="email"
        autoComplete="email"
        className={inputClass}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={disabled}
        required
        placeholder="admin@ejemplo.com"
      />
    </div>
  )
}

function PasswordForm({ email, setEmail, setError }: StepProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await trySignIn('credentials', { email, password }, 'Correo o contraseña incorrectos.')
    if (err) {
      setLoading(false)
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EmailField email={email} setEmail={setEmail} />
      <div>
        <label htmlFor="password" className="field-label">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            autoComplete="current-password"
            className={inputClass + ' pr-10'}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

function CodeForm({ email, setEmail, setError }: StepProps) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.message ?? 'No se pudo enviar el código.')
      setSent(true)
      setCode('')
      setInfo(data.message)
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await trySignIn('login-code', { email, code }, 'Código incorrecto o caducado.')
    if (err) {
      setLoading(false)
      setError(err)
    }
  }

  if (!sent) {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <EmailField email={email} setEmail={setEmail} />
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? 'Enviando...' : 'Enviar código'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">{info}</p>
      <EmailField email={email} setEmail={setEmail} disabled />
      <div>
        <label htmlFor="code" className="field-label">
          Código
        </label>
        <input
          id="code"
          className={inputClass + ' text-center tracking-widest'}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          required
          placeholder="000000"
          autoFocus
        />
      </div>
      <button type="submit" disabled={loading || code.length !== 6} className={primaryBtn}>
        {loading ? 'Verificando...' : 'Entrar'}
      </button>
      <button type="button" className={`${linkBtn} w-full`} onClick={() => requestCode()} disabled={loading}>
        Enviar otro código
      </button>
    </form>
  )
}

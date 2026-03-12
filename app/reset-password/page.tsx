'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FiEye, FiEyeOff } from 'react-icons/fi'

type Status = 'idle' | 'loading' | 'success' | 'error'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ' +
    'focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ' +
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

  const inputError =
    'w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm ' +
    'focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ' +
    'dark:border-red-500 dark:bg-gray-800 dark:text-gray-100'

  const ci = (err?: string) => (err ? inputError : inputClass)

  function clr(key: string) {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  if (!token) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-medium">Enlace inválido</p>
        <p className="mt-1">No se encontró el token de restablecimiento.</p>
        <Link href="/forgot-password" className="mt-3 block text-sky-600 hover:underline dark:text-sky-400">
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setFieldErrors({})

    const errs: Record<string, string> = {}
    if (password.length < 8) errs.password = 'La contraseña debe tener al menos 8 caracteres'
    if (!passwordConfirmation) errs.password_confirmation = 'Debes confirmar la contraseña'
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      errs.password_confirmation = 'Las contraseñas no coinciden'
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 422 && data.errors?.fieldErrors) {
          const errs: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(data.errors.fieldErrors)) {
            if (Array.isArray(msgs) && msgs.length) errs[key] = msgs[0] as string
          }
          setFieldErrors(errs)
          setStatus('idle')
        } else {
          setErrorMessage(data.message ?? 'Ocurrió un error. Por favor intenta de nuevo.')
          setStatus('error')
        }
        return
      }

      setStatus('success')
    } catch {
      setErrorMessage('Ocurrió un error de red. Por favor intenta de nuevo.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <p className="font-medium">Contraseña actualizada</p>
          <p className="mt-1 text-green-600 dark:text-green-500">
            Tu contraseña ha sido restablecida exitosamente.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 px-4 py-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-medium">Enlace inválido o expirado</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            className={ci(fieldErrors.password) + ' pr-10'}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clr('password') }}
            required
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            className={ci(fieldErrors.password_confirmation) + ' pr-10'}
            type={showPasswordConfirmation ? 'text' : 'password'}
            value={passwordConfirmation}
            onChange={(e) => { setPasswordConfirmation(e.target.value); clr('password_confirmation') }}
            required
            placeholder="Repite la contraseña"
            autoComplete="new-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPasswordConfirmation((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPasswordConfirmation ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        </div>
        {fieldErrors.password_confirmation && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.password_confirmation}</p>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
      >
        {status === 'loading' ? 'Guardando...' : 'Restablecer contraseña'}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Restablecer contraseña
        </h1>
        <Suspense
          fallback={
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}

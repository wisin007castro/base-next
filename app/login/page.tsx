'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { FiEye, FiEyeOff } from 'react-icons/fi'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let res: Awaited<ReturnType<typeof signIn>>
    try {
      res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
    } catch {
      // El servidor respondió con algo que no es JSON (500, caída) o no hubo red
      setLoading(false)
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      return
    }

    setLoading(false)

    if (!res || res.error) {
      setError(
        res?.code === 'rate_limited'
          ? 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
          : 'Correo o contraseña incorrectos.',
      )
      return
    }

    // Hard reload para que el layout relea la sesión del servidor
    window.location.replace('/')
  }

  const inputClass = 'field-input'

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

        <form onSubmit={handleSubmit} className="space-y-4">
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
              required
              placeholder="admin@ejemplo.com"
            />
          </div>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-sky-600 hover:underline dark:text-sky-400">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

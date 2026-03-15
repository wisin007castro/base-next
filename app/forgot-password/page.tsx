'use client'
import { useState } from 'react'
import Link from 'next/link'

type Status = 'idle' | 'loading' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const inputClass = 'field-input'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        setError('Ocurrió un error. Por favor intenta de nuevo.')
        setStatus('idle')
        return
      }

      setStatus('sent')
    } catch {
      setError('Ocurrió un error de red. Por favor intenta de nuevo.')
      setStatus('idle')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Olvidé mi contraseña
        </h1>

        {status === 'sent' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <p className="font-medium">Revisa tu correo</p>
              <p className="mt-1 text-green-600 dark:text-green-500">
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu
                contraseña en los próximos minutos.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-sky-600 hover:underline dark:text-sky-400"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">
                  Correo electrónico
                </label>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
              >
                {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm text-sky-600 hover:underline dark:text-sky-400"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

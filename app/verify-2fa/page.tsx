'use client'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Verify2FAPage() {
  const { update } = useSession()
  const router     = useRouter()
  const [code, setCode]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = 'field-input text-center tracking-widest'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Error al verificar el código.')
        setLoading(false)
        return
      }

      // Actualizar la sesión JWT para quitar twoFactorPending y añadir roles/permisos
      await update({ twoFactorVerified: true })
      router.replace('/')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Verificación en dos pasos
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Introduce el código de 6 dígitos de tu aplicación de autenticación.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">
              Código OTP
            </label>
            <input
              className={inputClass}
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              autoComplete="one-time-code"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

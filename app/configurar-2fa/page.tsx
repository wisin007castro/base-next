'use client'
import { signOut, useSession } from 'next-auth/react'
import { useMe } from '@/lib/hooks/me.hooks'
import { TwoFactorSection } from '@/app/components/users/TwoFactorSection'

/**
 * La política de Configuración → Acceso obliga a este usuario a usar 2FA y aún no lo tiene:
 * el middleware lo trae aquí hasta que lo active.
 */
export default function ConfigurarTwoFactorPage() {
  const { data: user, isPending } = useMe()
  const { update } = useSession()

  async function onEnabled() {
    // Refrescar el JWT: el servidor recalcula twoFactorSetupRequired (ya false) y se abre la app
    await update()
    window.location.replace('/')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Activa la verificación en dos pasos</h1>
        <p className="mt-1 text-sm text-ink-3">
          La configuración del sistema exige que tu cuenta use 2FA. Actívala para continuar.
        </p>
      </div>
      {isPending || !user ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : (
        <TwoFactorSection user={user} onEnabled={onEnabled} canDisable={false} />
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-sm text-ink-3 hover:text-ink-1 hover:underline"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

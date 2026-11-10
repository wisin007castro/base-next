'use client'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import { InvitationsTable, InviteForm } from '@/app/components/users/Invitations'

export default function InvitacionesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink-1">
          <FiArrowLeft className="h-4 w-4" /> Usuarios
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink-1">Invitaciones</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          La persona recibe un enlace, elige su usuario y contraseña, y entra con los roles indicados.
        </p>
      </div>
      <InviteForm />
      <InvitationsTable />
    </div>
  )
}

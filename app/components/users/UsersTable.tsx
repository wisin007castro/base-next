'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiEdit2, FiTrash2, FiRotateCcw, FiMail, FiCheckCircle, FiUser } from 'react-icons/fi'
import type { User } from '@/lib/types/user.types'
import { UserStatusBadge, UserVerifiedBadge, UserRolesBadges } from './UserStatusBadge'
import {
  useRemoveUser,
  useRestoreUser,
  useResendVerification,
  useVerifyUser,
  usePrefetchUser,
} from '@/lib/hooks/users.hooks'

interface Props {
  users: User[]
  startIndex?: number
}

function UserAvatar({ user }: { user: User }) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = user.profile?.avatar_thumb_url
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-[var(--accent-fg)]">
      {thumbUrl && !imgError ? (
        <Image
          src={thumbUrl}
          alt={user.username}
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      ) : (
        <FiUser className="h-4 w-4" />
      )}
    </div>
  )
}

export function UsersTable({ users, startIndex = 1 }: Props) {
  const remove = useRemoveUser()
  const restore = useRestoreUser()
  const resend = useResendVerification()
  const verify = useVerifyUser()
  const prefetchUser = usePrefetchUser()

  if (users.length === 0) {
    return <div className="py-16 text-center text-sm text-ink-3">No se encontraron usuarios.</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line-2)] bg-surface">
      <table className="w-full text-sm">
        <thead className="border-accent/20 border-b bg-[var(--accent-subtle)] text-left text-xs font-semibold uppercase tracking-wider text-accent">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Verificado</th>
            <th className="px-4 py-3">Último acceso</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line-1)]">
          {users.map((user, index) => (
            <tr key={user.id} className="hover:bg-accent/[0.07] transition-colors">
              <td className="px-4 py-3 text-ink-3">{startIndex + index}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/usuarios/${user.id}/editar`}
                  onMouseEnter={() => prefetchUser(user.id)}
                  onFocus={() => prefetchUser(user.id)}
                  className="group flex items-center gap-2.5"
                >
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-1 transition-colors group-hover:text-accent">
                      {user.username}
                    </div>
                    <div className="group-hover:text-accent/70 truncate text-xs text-ink-3 transition-colors">
                      {user.email}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-2">
                {user.profile ? (
                  `${user.profile.nombre} ${user.profile.primer_apellido}`
                ) : (
                  <span className="italic text-ink-4">Sin perfil</span>
                )}
              </td>
              <td className="px-4 py-3">
                <UserRolesBadges roles={user.roles} />
              </td>
              <td className="px-4 py-3">
                <UserStatusBadge user={user} />
              </td>
              <td className="px-4 py-3">
                <UserVerifiedBadge verifiedAt={user.email_verified_at} />
              </td>
              <td className="px-4 py-3 text-xs text-ink-3">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('es') : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {user.deleted_at ? (
                    <button
                      onClick={() => restore.mutate(user.id)}
                      disabled={restore.isPending}
                      title="Restaurar"
                      className="rounded p-1.5 text-ok transition-colors hover:bg-[var(--ok-bg)]"
                    >
                      <FiRotateCcw className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      {!user.email_verified_at && (
                        <>
                          <button
                            onClick={() => verify.mutate(user.id)}
                            disabled={verify.isPending}
                            title="Verificar manualmente"
                            className="rounded p-1.5 text-ok transition-colors hover:bg-[var(--ok-bg)]"
                          >
                            <FiCheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => resend.mutate(user.id)}
                            disabled={resend.isPending}
                            title="Reenviar verificación por email"
                            className="rounded p-1.5 text-warn transition-colors hover:bg-[var(--warn-bg)]"
                          >
                            <FiMail className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <Link
                        href={`/usuarios/${user.id}/editar`}
                        onMouseEnter={() => prefetchUser(user.id)}
                        onFocus={() => prefetchUser(user.id)}
                        className="rounded p-1.5 text-accent transition-colors hover:bg-[var(--accent-subtle)]"
                        title="Editar"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => remove.mutate(user.id)}
                        disabled={remove.isPending}
                        title="Eliminar"
                        className="rounded p-1.5 text-risk transition-colors hover:bg-[var(--risk-bg)]"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

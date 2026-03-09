'use client'
import Link from 'next/link'
import Image from 'next/image'
import { FiEdit2, FiTrash2, FiRotateCcw, FiMail, FiCheckCircle, FiUser } from 'react-icons/fi'
import type { User } from '@/lib/types/user.types'
import { UserStatusBadge, UserVerifiedBadge, UserRolesBadges } from './UserStatusBadge'
import { useRemoveUser, useRestoreUser, useResendVerification, useToggleActive, useVerifyUser } from '@/lib/hooks/users.hooks'

interface Props {
  users: User[]
  withTrashed?: boolean
  startIndex?: number
}

function UserAvatar({ user }: { user: User }) {
  const thumbUrl = user.profile?.avatar_thumb_url
  return (
    <div className="relative w-8 h-8 rounded-full shrink-0 overflow-hidden bg-sky-600 flex items-center justify-center text-white">
      {thumbUrl
        ? <Image src={thumbUrl} alt={user.username} fill className="object-cover" unoptimized />
        : <FiUser className="w-4 h-4" />
      }
    </div>
  )
}

export function UsersTable({ users, withTrashed = false, startIndex = 1 }: Props) {
  const remove = useRemoveUser()
  const restore = useRestoreUser()
  const resend = useResendVerification()
  const toggle = useToggleActive()
  const verify = useVerifyUser()

  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        No se encontraron usuarios.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {users.map((user, index) => (
            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-gray-400">{startIndex + index}</td>
              <td className="px-4 py-3">
                <Link href={`/usuarios/${user.id}/editar`} className="flex items-center gap-2.5 group">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{user.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate group-hover:text-sky-500 dark:group-hover:text-sky-500 transition-colors">{user.email}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                {user.profile
                  ? `${user.profile.nombre} ${user.profile.primer_apellido}`
                  : <span className="text-gray-400 italic">Sin perfil</span>
                }
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
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                {user.last_login_at
                  ? new Date(user.last_login_at).toLocaleDateString('es')
                  : '—'
                }
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {user.deleted_at ? (
                    <button
                      onClick={() => restore.mutate(user.id)}
                      disabled={restore.isPending}
                      title="Restaurar"
                      className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <FiRotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      {!user.email_verified_at && (
                        <>
                          <button
                            onClick={() => verify.mutate(user.id)}
                            disabled={verify.isPending}
                            title="Verificar manualmente"
                            className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => resend.mutate(user.id)}
                            disabled={resend.isPending}
                            title="Reenviar verificación por email"
                            className="rounded p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
                          >
                            <FiMail className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <Link
                        href={`/usuarios/${user.id}/editar`}
                        className="rounded p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => remove.mutate(user.id)}
                        disabled={remove.isPending}
                        title="Eliminar"
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
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

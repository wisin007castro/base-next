import type { User } from '@/lib/types/user.types'

interface Props {
  user: Pick<User, 'is_active' | 'email_verified_at' | 'deleted_at'>
}

export function UserStatusBadge({ user }: Props) {
  if (user.deleted_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Eliminado
      </span>
    )
  }

  if (!user.is_active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        Inactivo
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Activo
    </span>
  )
}

interface VerifiedBadgeProps {
  verifiedAt: string | null
}

export function UserVerifiedBadge({ verifiedAt }: VerifiedBadgeProps) {
  if (!verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Sin verificar
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
      Verificado
    </span>
  )
}

const roleColors: Record<string, string> = {
  admin:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  moderador: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  usuario:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

interface RoleBadgeProps { role: string }

export function UserRoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleColors[role] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
      {role}
    </span>
  )
}

/** Muestra todos los roles de un usuario */
interface RolesBadgesProps { roles?: { name: string }[] }

export function UserRolesBadges({ roles }: RolesBadgesProps) {
  if (!roles?.length) return <span className="text-xs text-gray-400">Sin rol</span>
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => <UserRoleBadge key={r.name} role={r.name} />)}
    </div>
  )
}

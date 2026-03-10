import type { User } from '@/lib/types/user.types'

interface Props {
  user: Pick<User, 'is_active' | 'email_verified_at' | 'deleted_at'>
}

const badge = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium'

export function UserStatusBadge({ user }: Props) {
  if (user.deleted_at) {
    return (
      <span className={`${badge} bg-[var(--risk-bg)] text-risk`}>
        Eliminado
      </span>
    )
  }

  if (!user.is_active) {
    return (
      <span className={`${badge} bg-[var(--line-2)] text-ink-3`}>
        Inactivo
      </span>
    )
  }

  return (
    <span className={`${badge} bg-[var(--ok-bg)] text-ok`}>
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
      <span className={`${badge} bg-[var(--warn-bg)] text-warn`}>
        Sin verificar
      </span>
    )
  }

  return (
    <span className={`${badge} bg-[var(--accent-subtle)] text-accent`}>
      Verificado
    </span>
  )
}

// Role badge colors: authority tiers — admin (highest) → usuario (base)
const roleColors: Record<string, string> = {
  admin:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  moderador: 'bg-[var(--warn-bg)] text-warn',
  usuario:   'bg-[var(--accent-subtle)] text-accent',
}

interface RoleBadgeProps { role: string }

export function UserRoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`${badge} capitalize ${roleColors[role] ?? 'bg-[var(--line-2)] text-ink-3'}`}>
      {role}
    </span>
  )
}

/** Muestra todos los roles de un usuario */
interface RolesBadgesProps { roles?: { name: string }[] }

export function UserRolesBadges({ roles }: RolesBadgesProps) {
  if (!roles?.length) return <span className="text-xs text-ink-4">Sin rol</span>
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => <UserRoleBadge key={r.name} role={r.name} />)}
    </div>
  )
}

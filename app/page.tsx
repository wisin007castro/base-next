'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiUserPlus,
  FiShield,
  FiKey,
} from 'react-icons/fi'

interface DashboardData {
  users: {
    total: number
    active: number
    inactive: number
    deleted: number
    new_this_week: number
  }
  roles: { total: number }
  permissions: { total: number }
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | undefined
  colorClass: string
  bgClass: string
}

function StatCard({ icon, label, value, colorClass, bgClass }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--line-2)] bg-[var(--surface)] p-5 shadow-sm flex items-start gap-4">
      <div className={`flex-shrink-0 rounded-lg p-3 ${bgClass}`}>
        <span className={`block w-5 h-5 ${colorClass}`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink-1">
          {value !== undefined ? value.toLocaleString() : '—'}
        </p>
        <p className="mt-0.5 text-sm text-ink-3 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/dashboard')
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar el dashboard')
        return res.json() as Promise<DashboardData>
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Error desconocido')
        setLoading(false)
      })
  }, [status])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-ink-3">Cargando dashboard...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
        {error}
      </div>
    )
  }

  const userName = session?.user?.name ?? session?.user?.email ?? 'Usuario'

  const cards: StatCardProps[] = [
    {
      icon: <FiUsers className="w-5 h-5" />,
      label: 'Usuarios totales',
      value: data?.users.total,
      colorClass: 'text-sky-600 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-900/30',
    },
    {
      icon: <FiUserCheck className="w-5 h-5" />,
      label: 'Usuarios activos',
      value: data?.users.active,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      icon: <FiUserX className="w-5 h-5" />,
      label: 'Usuarios inactivos',
      value: data?.users.inactive,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      icon: <FiUserPlus className="w-5 h-5" />,
      label: 'Nuevos esta semana',
      value: data?.users.new_this_week,
      colorClass: 'text-violet-600 dark:text-violet-400',
      bgClass: 'bg-violet-50 dark:bg-violet-900/30',
    },
    {
      icon: <FiShield className="w-5 h-5" />,
      label: 'Roles',
      value: data?.roles.total,
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      bgClass: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      icon: <FiKey className="w-5 h-5" />,
      label: 'Permisos',
      value: data?.permissions.total,
      colorClass: 'text-pink-600 dark:text-pink-400',
      bgClass: 'bg-pink-50 dark:bg-pink-900/30',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Dashboard</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          Bienvenido, <span className="font-medium text-ink-2">{userName}</span>. Aquí tienes el
          resumen del sistema.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Deleted users note */}
      {data && data.users.deleted > 0 && (
        <p className="text-xs text-ink-4">
          Hay{' '}
          <span className="font-medium text-ink-3">{data.users.deleted}</span>{' '}
          {data.users.deleted === 1 ? 'usuario eliminado' : 'usuarios eliminados'} (soft delete) no
          incluidos en el total.
        </p>
      )}
    </div>
  )
}

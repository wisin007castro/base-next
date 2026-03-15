'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  FiUsers, FiUserCheck, FiUserX, FiUserPlus,
  FiShield, FiKey, FiArrowRight, FiActivity,
} from 'react-icons/fi'

interface RecentUser {
  id: string
  username: string
  createdAt: string
  isActive: boolean
}

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
  recentUsers: RecentUser[]
}

// ─── Mini stat tile ───────────────────────────────────────────────────────────
function StatTile({
  icon, value, label, bgClass, textClass,
}: {
  icon: React.ReactNode
  value: number | undefined
  label: string
  bgClass: string
  textClass: string
}) {
  return (
    <div className={`rounded-xl px-5 py-6 flex flex-col gap-3 ${bgClass}`}>
      <span className={textClass}>{icon}</span>
      <div>
        <p className={`text-2xl font-bold ${textClass}`}>
          {value !== undefined ? value.toLocaleString() : '—'}
        </p>
        <p className={`text-xs font-medium mt-0.5 opacity-80 ${textClass}`}>{label}</p>
      </div>
    </div>
  )
}

// ─── Large nav card (roles / permisos) ───────────────────────────────────────
function BigStatCard({
  icon, value, label, href, bgClass, textClass,
}: {
  icon: React.ReactNode
  value: number | undefined
  label: string
  href: string
  bgClass: string
  textClass: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-[var(--line-2)] bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className={`flex-shrink-0 rounded-xl p-3 ${bgClass}`}>
        <span className={`block ${textClass}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-ink-1">
          {value !== undefined ? value.toLocaleString() : '—'}
        </p>
        <p className="text-sm text-ink-3">{label}</p>
      </div>
      <FiArrowRight
        className="flex-shrink-0 text-ink-4 transition-colors group-hover:text-accent"
        size={16}
      />
    </Link>
  )
}

// ─── Timeline item ────────────────────────────────────────────────────────────
function TimelineItem({ user, isLast }: { user: RecentUser; isLast: boolean }) {
  const date = new Date(user.createdAt)
  const formatted = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            user.isActive ? 'bg-ok' : 'bg-warn'
          }`}
        />
        {!isLast && <span className="mt-1 w-px flex-1 bg-[var(--line-2)]" />}
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-sm font-medium text-ink-1 truncate">{user.username}</p>
        <p className="text-xs text-ink-3">{formatted} · {time}</p>
      </div>
    </div>
  )
}

// ─── Progress ratio bar ───────────────────────────────────────────────────────
function RatioBar({
  label, value, total, barClass, textClass,
}: {
  label: string
  value: number
  total: number
  barClass: string
  textClass: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${textClass}`}>{label}</span>
        <span className="text-sm font-semibold text-ink-1">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line-1)]">
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-3">{pct}% del total</p>
    </div>
  )
}

// ─── Quick link item ──────────────────────────────────────────────────────────
function QuickLink({
  href, label, description, barClass, icon,
}: {
  href: string
  label: string
  description: string
  barClass: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 py-3 transition-opacity hover:opacity-90"
    >
      <span className={`w-1 self-stretch rounded-full flex-shrink-0 ${barClass}`} />
      <span className="flex-shrink-0 text-ink-3 transition-colors group-hover:text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-1 transition-colors group-hover:text-accent">
          {label}
        </p>
        <p className="text-xs text-ink-3">{description}</p>
      </div>
      <FiArrowRight
        className="flex-shrink-0 text-ink-4 transition-colors group-hover:text-accent"
        size={14}
      />
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/dashboard')
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar el dashboard')
        return res.json() as Promise<DashboardData>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [status])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-ink-3">Cargando dashboard…</p>
      </div>
    )
  }
  if (status === 'unauthenticated') return null
  if (error) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">{error}</div>
    )
  }

  const userName = session?.user?.name ?? session?.user?.email ?? 'Usuario'
  const total = data?.users.total ?? 0

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Dashboard</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          Bienvenido, <span className="font-medium text-ink-2">{userName}</span>.
          Resumen del sistema de gestión.
        </p>
      </div>

      {/* ── Row 1: Hero + Timeline + Roles/Permisos ──────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Hero card — resumen usuarios */}
        <div className="overflow-hidden rounded-xl border border-[var(--line-2)] bg-surface shadow-sm">
          {/* Accent header */}
          <div className="bg-accent px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-fg)] opacity-70">
                  Usuarios del sistema
                </p>
                <p className="mt-1 text-3xl font-bold text-[var(--accent-fg)]">
                  {data?.users.total.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <FiUsers size={24} className="text-[var(--accent-fg)]" />
              </div>
            </div>
          </div>
          {/* 2×2 mini-tiles */}
          <div className="grid grid-cols-2 gap-3 p-4">
            <StatTile
              icon={<FiUserCheck size={20} />}
              value={data?.users.active}
              label="Activos"
              bgClass="bg-[var(--ok-bg)]"
              textClass="text-ok"
            />
            <StatTile
              icon={<FiUserX size={20} />}
              value={data?.users.inactive}
              label="Inactivos"
              bgClass="bg-[var(--warn-bg)]"
              textClass="text-warn"
            />
            <StatTile
              icon={<FiUserPlus size={20} />}
              value={data?.users.new_this_week}
              label="Nuevos (7d)"
              bgClass="bg-accent-subtle"
              textClass="text-accent"
            />
            <StatTile
              icon={<FiUsers size={20} />}
              value={data?.users.deleted}
              label="Eliminados"
              bgClass="bg-[var(--risk-bg)]"
              textClass="text-risk"
            />
          </div>
        </div>

        {/* Actividad reciente — timeline */}
        <div className="rounded-xl border border-[var(--line-2)] bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--line-2)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-ink-1">Actividad reciente</p>
              <p className="text-xs text-ink-3">Últimos usuarios registrados</p>
            </div>
            <span className="rounded-lg bg-accent-subtle p-2 text-accent">
              <FiActivity size={16} />
            </span>
          </div>
          <div className="px-5 py-4">
            {data?.recentUsers && data.recentUsers.length > 0 ? (
              data.recentUsers.map((u, i) => (
                <TimelineItem
                  key={u.id}
                  user={u}
                  isLast={i === data.recentUsers.length - 1}
                />
              ))
            ) : (
              <p className="text-sm text-ink-3">Sin usuarios registrados aún.</p>
            )}
          </div>
          <div className="border-t border-[var(--line-2)] px-5 py-3">
            <Link
              href="/usuarios"
              className="flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:opacity-80"
            >
              Ver todos los usuarios <FiArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Roles + Permisos + callout nuevos */}
        <div className="flex flex-col gap-4">
          <BigStatCard
            icon={<FiShield size={22} />}
            value={data?.roles.total}
            label="Roles definidos"
            href="/roles"
            bgClass="bg-[var(--ok-bg)]"
            textClass="text-ok"
          />
          <BigStatCard
            icon={<FiKey size={22} />}
            value={data?.permissions.total}
            label="Permisos registrados"
            href="/permisos"
            bgClass="bg-accent-subtle"
            textClass="text-accent"
          />
          {(data?.users.new_this_week ?? 0) > 0 && (
            <div className="rounded-xl border border-accent/30 bg-accent-subtle px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent opacity-70">
                Esta semana
              </p>
              <p className="mt-1 text-2xl font-bold text-accent">
                +{data?.users.new_this_week}
              </p>
              <p className="text-xs text-accent opacity-80">
                {data?.users.new_this_week === 1 ? 'nuevo usuario' : 'nuevos usuarios'} registrados
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Row 2: Quick links + Distribución ────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

        {/* Quick access links */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--line-2)] bg-surface shadow-sm">
          <div className="border-b border-[var(--line-2)] px-5 py-4">
            <p className="text-sm font-semibold text-ink-1">Accesos rápidos</p>
            <p className="text-xs text-ink-3">Navegación directa a secciones</p>
          </div>
          <div className="divide-y divide-[var(--line-1)] px-5">
            <QuickLink
              href="/usuarios"
              label="Gestión de usuarios"
              description="Crear, editar y administrar cuentas"
              barClass="bg-accent"
              icon={<FiUsers size={16} />}
            />
            <QuickLink
              href="/roles"
              label="Roles del sistema"
              description="Definir y asignar roles"
              barClass="bg-ok"
              icon={<FiShield size={16} />}
            />
            <QuickLink
              href="/permisos"
              label="Permisos"
              description="Controlar acceso granular"
              barClass="bg-warn"
              icon={<FiKey size={16} />}
            />
          </div>
        </div>

        {/* User status distribution */}
        <div className="lg:col-span-3 rounded-xl border border-[var(--line-2)] bg-surface shadow-sm">
          <div className="border-b border-[var(--line-2)] px-5 py-4">
            <p className="text-sm font-semibold text-ink-1">Distribución de usuarios</p>
            <p className="text-xs text-ink-3">
              {total} {total === 1 ? 'usuario activo' : 'usuarios'} en el sistema
            </p>
          </div>
          <div className="space-y-5 px-5 py-5">
            <RatioBar
              label="Activos"
              value={data?.users.active ?? 0}
              total={total}
              barClass="bg-ok"
              textClass="text-ok"
            />
            <RatioBar
              label="Inactivos"
              value={data?.users.inactive ?? 0}
              total={total}
              barClass="bg-warn"
              textClass="text-warn"
            />
            {(data?.users.deleted ?? 0) > 0 && (
              <RatioBar
                label="Eliminados (soft)"
                value={data?.users.deleted ?? 0}
                total={total + (data?.users.deleted ?? 0)}
                barClass="bg-risk"
                textClass="text-risk"
              />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

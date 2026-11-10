'use client'
import { usePublicSettings } from '@/lib/hooks/settings.hooks'

/** Nombre / logo del sistema (Configuración → Sistema) */
export function Brand({ className = '' }: { className?: string }) {
  const { data } = usePublicSettings()
  if (!data) return <span className={`inline-block h-4 w-28 animate-pulse rounded bg-white/10 ${className}`} />
  if (data.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa configurable (fuera de remotePatterns)
      <img
        src={data.logoUrl}
        alt={data.systemName}
        className={`h-7 w-auto max-w-[10rem] object-contain ${className}`}
      />
    )
  }
  return <span className={className}>{data.systemName}</span>
}

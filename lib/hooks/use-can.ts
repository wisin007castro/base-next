'use client'
import { useSession } from 'next-auth/react'

/**
 * ¿El usuario tiene este permiso? El rol `admin` siempre puede.
 * Solo para mostrar/ocultar UI: la autorización real la hace la API (`requirePermission`).
 */
export function useCan(permission: string): boolean {
  const { data } = useSession()
  const user = data?.user as { roles?: string[]; permissions?: string[] } | undefined
  return !!user && (!!user.roles?.includes('admin') || !!user.permissions?.includes(permission))
}

import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export type GuardSession = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    roles: string[]
    permissions: string[]
    /** id de la fila en user_sessions (jti) de esta sesión */
    sid?: string
  }
}

type RawUser = {
  id?: string
  name?: string | null
  email?: string | null
  roles?: string[]
  permissions?: string[]
  sid?: string
}

function buildGuard(session: { user?: RawUser | null } | null): GuardSession {
  const u = session!.user as RawUser
  return {
    user: {
      id: u.id!,
      name: u.name,
      email: u.email,
      roles: u.roles ?? [],
      permissions: u.permissions ?? [],
      sid: u.sid,
    },
  }
}

/** Requiere sesión activa. Devuelve GuardSession o NextResponse 401. */
export async function requireAuth(): Promise<GuardSession | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }
  return buildGuard(session)
}

/** Requiere sesión activa con rol 'admin'. Devuelve GuardSession o NextResponse 401/403. */
export async function requireAdmin(): Promise<GuardSession | NextResponse> {
  const result = await requireAuth()
  if (isGuardError(result)) return result
  if (!result.user.roles.includes('admin')) {
    return NextResponse.json({ message: 'Acceso no autorizado' }, { status: 403 })
  }
  return result
}

/**
 * Requiere un permiso concreto (p. ej. `productos.edit`). El rol `admin` pasa siempre.
 * Los permisos vienen del JWT: un cambio de permisos se aplica al volver a iniciar sesión.
 */
export async function requirePermission(permission: string): Promise<GuardSession | NextResponse> {
  const result = await requireAuth()
  if (isGuardError(result)) return result
  const { roles, permissions } = result.user
  if (!roles.includes('admin') && !permissions.includes(permission)) {
    return NextResponse.json({ message: 'Acceso no autorizado' }, { status: 403 })
  }
  return result
}

/** Requiere al menos uno de los permisos. El rol `admin` pasa siempre. */
export async function requireAnyPermission(permissions: string[]): Promise<GuardSession | NextResponse> {
  const result = await requireAuth()
  if (isGuardError(result)) return result
  const { roles, permissions: has } = result.user
  if (!roles.includes('admin') && !permissions.some(p => has.includes(p))) {
    return NextResponse.json({ message: 'Acceso no autorizado' }, { status: 403 })
  }
  return result
}

/**
 * Requiere que exista un token con id, aunque tenga twoFactorPending.
 * Útil para rutas que se llaman durante el flujo de verificación 2FA.
 */
export async function requireAuthPending(): Promise<GuardSession | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }
  return buildGuard(session)
}

/** Type guard: comprueba si el resultado es un error de autenticación. */
export function isGuardError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

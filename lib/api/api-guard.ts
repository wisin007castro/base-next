import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export type GuardSession = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    roles: string[]
    permissions: string[]
  }
}

type RawUser = {
  id?: string
  name?: string | null
  email?: string | null
  roles?: string[]
  permissions?: string[]
}

function buildGuard(session: Awaited<ReturnType<typeof auth>>): GuardSession {
  const u = session!.user as RawUser
  return {
    user: {
      id:          u.id!,
      name:        u.name,
      email:       u.email,
      roles:       u.roles       ?? [],
      permissions: u.permissions ?? [],
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

/** Type guard: comprueba si el resultado es un error de autenticación. */
export function isGuardError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

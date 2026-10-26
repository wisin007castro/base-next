import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { userSessions } from '@/lib/db/schema'

// DELETE /api/me/sessions/:id — revocar una sesión activa del usuario
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const sessionId = Number(id)
  const userId    = Number(guard.user.id)

  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
  }

  // Verificar que la sesión pertenece al usuario
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq(userSessions.id, sessionId),
      eq(userSessions.userId, userId),
    ),
  })

  if (!session) {
    return NextResponse.json({ message: 'Sesión no encontrada' }, { status: 404 })
  }

  await db
    .update(userSessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(userSessions.id, sessionId))

  return NextResponse.json({ message: 'Sesión cerrada' })
}

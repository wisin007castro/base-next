import { NextResponse } from 'next/server'
import { eq, and, isNull, gt, desc } from 'drizzle-orm'
import { requireAuth, isGuardError } from '@/lib/api/api-guard'
import { db } from '@/lib/db'
import { userSessions } from '@/lib/db/schema'

// GET /api/me/sessions — sesiones activas del usuario
export async function GET() {
  const guard = await requireAuth()
  if (isGuardError(guard)) return guard

  const userId = Number(guard.user.id)
  const now    = new Date().toISOString()

  const sessions = await db.query.userSessions.findMany({
    where: and(
      eq(userSessions.userId, userId),
      isNull(userSessions.revokedAt),
      gt(userSessions.expiresAt, now),
    ),
    orderBy: [desc(userSessions.lastUsedAt)],
  })

  type SessionRow = typeof sessions[number]

  return NextResponse.json(
    sessions.map((s: SessionRow) => ({
      id:          s.id,
      jti:         s.jti,
      userAgent:   s.userAgent,
      ip:          s.ip,
      createdAt:   s.createdAt,
      lastUsedAt:  s.lastUsedAt,
      expiresAt:   s.expiresAt,
    })),
  )
}

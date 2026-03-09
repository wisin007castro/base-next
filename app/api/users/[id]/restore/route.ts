import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

// POST /api/users/:id/restore
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const now    = new Date().toISOString()

  await db
    .update(users)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(users.id, Number(id)))

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(id)),
    with:  { profile: true },
  })
  return NextResponse.json(serializeUser(user!))
}

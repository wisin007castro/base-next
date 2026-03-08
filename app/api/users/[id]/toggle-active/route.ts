import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { serializeUser } from '@/lib/api/serializers/user.serializer'

// POST /api/users/:id/toggle-active
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const userId  = Number(id)
  const now     = new Date().toISOString()

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })

  await db
    .update(users)
    .set({ isActive: !user.isActive, updatedAt: now })
    .where(eq(users.id, userId))

  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with:  { profile: true },
  })
  return NextResponse.json(serializeUser(result!))
}

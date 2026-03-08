import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyToken } from '@/lib/auth/tokens'

// GET /api/verify-email?token=xxx — verifica el token y activa el email
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', req.nextUrl.origin))
  }

  const userId = verifyToken(token)
  if (!userId) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.nextUrl.origin))
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    return NextResponse.redirect(new URL('/verify-email?error=notfound', req.nextUrl.origin))
  }

  if (user.emailVerifiedAt) {
    return NextResponse.redirect(new URL('/verify-email?status=already', req.nextUrl.origin))
  }

  const now = new Date().toISOString()
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, userId))

  return NextResponse.redirect(new URL('/verify-email?status=success', req.nextUrl.origin))
}

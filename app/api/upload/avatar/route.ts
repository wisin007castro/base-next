import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { userProfiles } from '@/lib/db/schema'
import { uploadFile, deleteFile } from '@/lib/storage/storage.service'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// POST /api/upload/avatar — uploads avatar for the current user
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: 'No autenticado' }, { status: 401 })

  const userId = Number(session.user.id)
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ message: 'Tipo de archivo no permitido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ message: 'El archivo excede 5 MB' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const key = `avatars/${userId}.${ext}`

  // Delete previous avatar if exists
  const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
  if (existing?.avatarKey && existing.avatarKey !== key) {
    await deleteFile(existing.avatarKey).catch(() => null)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const avatarUrl = await uploadFile(key, buffer, file.type)

  const now = new Date().toISOString()
  if (existing) {
    await db.update(userProfiles).set({ avatarKey: key, avatarUrl, updatedAt: now }).where(eq(userProfiles.userId, userId))
  } else {
    await db.insert(userProfiles).values({ userId, avatarKey: key, avatarUrl, createdAt: now, updatedAt: now } as never)
  }

  return NextResponse.json({ avatar_url: avatarUrl, avatar_key: key })
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { userProfiles } from '@/lib/db/schema'
import { uploadFile, deleteFile } from '@/lib/storage/storage.service'
import { processAvatar } from '@/lib/storage/image.service'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB (el procesamiento reduce el tamaño final)

// POST /api/upload/avatar — sube y procesa el avatar del usuario actual
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: 'No autenticado' }, { status: 401 })

  const userId = Number(session.user.id)
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ message: 'Tipo de archivo no permitido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ message: 'El archivo excede 10 MB' }, { status: 400 })

  const raw = Buffer.from(await file.arrayBuffer())
  const { full, thumb } = await processAvatar(raw, userId)

  // Eliminar versiones anteriores si existen
  const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
  await Promise.all([
    existing?.avatarKey      ? deleteFile(existing.avatarKey).catch(() => null)      : null,
    existing?.avatarThumbKey ? deleteFile(existing.avatarThumbKey).catch(() => null) : null,
  ])

  // Subir ambas versiones en paralelo
  const [avatarUrl, avatarThumbUrl] = await Promise.all([
    uploadFile(full.key,  full.buffer,  full.contentType),
    uploadFile(thumb.key, thumb.buffer, thumb.contentType),
  ])

  const now = new Date().toISOString()
  const avatarData = {
    avatarKey:      full.key,
    avatarUrl,
    avatarThumbKey: thumb.key,
    avatarThumbUrl,
    updatedAt:      now,
  }

  if (existing) {
    await db.update(userProfiles).set(avatarData).where(eq(userProfiles.userId, userId))
  } else {
    await db.insert(userProfiles).values({ userId, ...avatarData, createdAt: now } as never)
  }

  return NextResponse.json({
    avatar_url:       avatarUrl,
    avatar_key:       full.key,
    avatar_thumb_url: avatarThumbUrl,
    avatar_thumb_key: thumb.key,
  })
}

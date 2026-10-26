import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { foreignKeyViolationResponse } from '@/lib/api/db-errors'

// DELETE /api/users/:id/force → borrado definitivo.
// Solo para usuarios ya eliminados (dos pasos). Por FK en cascada se borran también su perfil,
// roles, sesiones y su contenido (publicaciones, comentarios, votos).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard

  const userId = Number((await params).id)
  if (userId === Number(guard.user.id)) {
    return NextResponse.json({ message: 'No puedes eliminarte a ti mismo' }, { status: 422 })
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  if (!user.deletedAt) {
    return NextResponse.json(
      { message: 'Elimina primero el usuario; luego podrás borrarlo definitivamente' },
      { status: 409 },
    )
  }

  try {
    await db.delete(users).where(eq(users.id, userId))
  } catch (err) {
    const res = foreignKeyViolationResponse(err)
    if (res) return res
    throw err
  }
  return new NextResponse(null, { status: 204 })
}

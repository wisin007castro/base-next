import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userProfiles } from '@/lib/db/schema'
import { profileSchema, type UpdateUserInput } from '@/lib/api/schemas/user.schema'
import { uniqueViolationResponse } from '@/lib/api/db-errors'

type ProfileInput = NonNullable<UpdateUserInput['profile']>

const COLUMNS = {
  nombre: 'nombre',
  primer_apellido: 'primerApellido',
  segundo_apellido: 'segundoApellido',
  tipo_documento: 'tipoDocumento',
  numero_documento: 'numeroDocumento',
  fecha_nacimiento: 'fechaNacimiento',
  genero: 'genero',
  telefono: 'telefono',
  telefono_alternativo: 'telefonoAlternativo',
  pais: 'pais',
  departamento: 'departamento',
  ciudad: 'ciudad',
  direccion: 'direccion',
  codigo_postal: 'codigoPostal',
} as const satisfies Record<keyof ProfileInput, keyof typeof userProfiles.$inferInsert>

/**
 * Si el usuario aún no tiene perfil, el PATCH parcial lo crearía: entonces se exige el perfil
 * completo (nombre, documento, fecha…) y se responde 422 en vez de chocar con un NOT NULL.
 * Llamar antes de escribir nada para no dejar el usuario a medio actualizar.
 */
export async function validateProfileWrite(userId: number, profile: ProfileInput): Promise<NextResponse | null> {
  const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
  if (existing) return null
  const parsed = profileSchema.safeParse(profile)
  if (parsed.success) return null
  return NextResponse.json(
    { message: 'Completa los datos personales obligatorios', errors: parsed.error.flatten() },
    { status: 422 },
  )
}

/** Actualiza el perfil (o lo crea). Devuelve 422 si el número de documento ya está en uso. */
export async function saveProfile(userId: number, profile: ProfileInput, now: string): Promise<NextResponse | null> {
  const values: Record<string, unknown> = { updatedAt: now }
  for (const [src, dst] of Object.entries(COLUMNS)) {
    const v = profile[src as keyof ProfileInput]
    if (v !== undefined) values[dst] = v
  }

  try {
    const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
    if (existing) {
      await db.update(userProfiles).set(values).where(eq(userProfiles.userId, userId))
    } else {
      // validateProfileWrite ya garantizó los campos obligatorios
      await db.insert(userProfiles).values({ userId, ...values, createdAt: now } as typeof userProfiles.$inferInsert)
    }
  } catch (err) {
    const res = uniqueViolationResponse(err)
    if (res) return res
    throw err
  }
  return null
}

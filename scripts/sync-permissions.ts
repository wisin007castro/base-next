/**
 * Crea en la base los permisos de lib/auth/module-permissions.ts que falten
 * y los asigna al rol admin. Idempotente: no borra ni modifica nada existente.
 *
 *   npm run db:permissions
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { modulePermissionList } from '../lib/auth/module-permissions'

const db = drizzle(new Database(process.env.DATABASE_URL ?? './dev.db'), { schema })

const wanted = modulePermissionList()
if (wanted.length === 0) {
  console.log('No hay módulos registrados en lib/auth/module-permissions.ts')
  process.exit(0)
}

const now = new Date().toISOString()
const existing = db
  .select({ name: schema.permissions.name })
  .from(schema.permissions)
  .where(
    inArray(
      schema.permissions.name,
      wanted.map(p => p.name),
    ),
  )
  .all()
  .map(p => p.name)

const missing = wanted.filter(p => !existing.includes(p.name))
if (missing.length) {
  db.insert(schema.permissions)
    .values(missing.map(p => ({ ...p, guardName: 'web', createdAt: now, updatedAt: now })))
    .run()
}

// Asignar todos los permisos de módulos al rol admin (si no los tiene)
const admin = db.select().from(schema.roles).where(eq(schema.roles.name, 'admin')).get()
let assigned = 0
if (admin) {
  const perms = db
    .select({ id: schema.permissions.id })
    .from(schema.permissions)
    .where(
      inArray(
        schema.permissions.name,
        wanted.map(p => p.name),
      ),
    )
    .all()
  const has = db
    .select({ id: schema.rolePermissions.permissionId })
    .from(schema.rolePermissions)
    .where(eq(schema.rolePermissions.roleId, admin.id))
    .all()
    .map(r => r.id)
  const toAssign = perms.filter(p => !has.includes(p.id))
  if (toAssign.length) {
    db.insert(schema.rolePermissions)
      .values(toAssign.map(p => ({ roleId: admin.id, permissionId: p.id })))
      .run()
  }
  assigned = toAssign.length
}

console.log(`✔ Permisos: ${missing.length} creados, ${existing.length} ya existían. Asignados a admin: ${assigned}.`)
if (missing.length) console.log('  Los usuarios deben volver a iniciar sesión para recibir los permisos nuevos (JWT).')

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { permissions, rolePermissions, roles, userPermissions, userRoles, users } from '@/lib/db/schema'
import { getUserPermissions, setPrivilege } from './rbac'

// SQLite en memoria con las migraciones reales (vitest.setup.ts)
let userId: number
const perm: Record<string, number> = {}

beforeEach(async () => {
  for (const t of [userPermissions, rolePermissions, userRoles, permissions, roles, users]) await db.delete(t)
  const now = new Date().toISOString()
  userId = (
    await db
      .insert(users)
      .values({ username: 'ana', email: 'ana@test.local', password: 'x', createdAt: now, updatedAt: now })
      .returning({ id: users.id })
  )[0].id
  for (const name of ['a.view', 'b.view', 'c.view']) {
    perm[name] = (await db.insert(permissions).values({ name }).returning({ id: permissions.id }))[0].id
  }
  const roleId = (await db.insert(roles).values({ name: 'lector' }).returning({ id: roles.id }))[0].id
  await db.insert(rolePermissions).values([
    { roleId, permissionId: perm['a.view'] },
    { roleId, permissionId: perm['b.view'] },
  ])
  await db.insert(userRoles).values({ userId, roleId })
})

describe('permisos efectivos', () => {
  it('sin privilegios: los del rol', async () => {
    expect((await getUserPermissions(userId)).sort()).toEqual(['a.view', 'b.view'])
  })

  it('conceder suma un permiso que el rol no da', async () => {
    await setPrivilege(userId, perm['c.view'], { effect: 'grant' })
    expect((await getUserPermissions(userId)).sort()).toEqual(['a.view', 'b.view', 'c.view'])
  })

  it('denegar quita un permiso aunque el rol lo dé', async () => {
    await setPrivilege(userId, perm['a.view'], { effect: 'deny', reason: 'auditoría' })
    expect(await getUserPermissions(userId)).toEqual(['b.view'])
  })

  it('un privilegio caducado no cuenta', async () => {
    await setPrivilege(userId, perm['c.view'], { effect: 'grant', expiresAt: '2000-01-01T00:00:00.000Z' })
    await setPrivilege(userId, perm['a.view'], { effect: 'deny', expiresAt: '2000-01-01T00:00:00.000Z' })
    expect((await getUserPermissions(userId)).sort()).toEqual(['a.view', 'b.view'])
  })

  it('setPrivilege reemplaza el anterior sobre el mismo permiso', async () => {
    await setPrivilege(userId, perm['a.view'], { effect: 'deny' })
    await setPrivilege(userId, perm['a.view'], { effect: 'grant' })
    expect((await getUserPermissions(userId)).sort()).toEqual(['a.view', 'b.view'])
  })
})

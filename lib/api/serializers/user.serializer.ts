import type { User, UserProfile } from '@/lib/types/user.types'
import type { Role, Permission } from '@/lib/types/rbac.types'
import type { users, userProfiles, roles, permissions } from '@/lib/db/schema'

type DbUser    = typeof users.$inferSelect
type DbProfile = typeof userProfiles.$inferSelect
type DbRole    = typeof roles.$inferSelect & {
  rolePermissions?: { permission: typeof permissions.$inferSelect }[]
}

export function serializePermission(p: typeof permissions.$inferSelect): Permission {
  return {
    id:          p.id,
    name:        p.name,
    description: p.description,
    guard_name:  p.guardName,
    created_at:  p.createdAt,
    updated_at:  p.updatedAt,
  }
}

export function serializeRole(r: DbRole): Role {
  return {
    id:          r.id,
    name:        r.name,
    description: r.description,
    guard_name:  r.guardName,
    created_at:  r.createdAt,
    updated_at:  r.updatedAt,
    permissions: r.rolePermissions?.map((rp) => serializePermission(rp.permission)),
  }
}

export function serializeProfile(p: DbProfile): UserProfile {
  return {
    id:                  p.id,
    user_id:             p.userId,
    nombre:              p.nombre,
    primer_apellido:     p.primerApellido,
    segundo_apellido:    p.segundoApellido,
    tipo_documento:      p.tipoDocumento as UserProfile['tipo_documento'],
    numero_documento:    p.numeroDocumento,
    fecha_nacimiento:    p.fechaNacimiento,
    genero:              p.genero as UserProfile['genero'],
    telefono:            p.telefono,
    telefono_alternativo: p.telefonoAlternativo,
    pais:                p.pais,
    departamento:        p.departamento,
    ciudad:              p.ciudad,
    direccion:           p.direccion,
    codigo_postal:       p.codigoPostal,
    created_at:          p.createdAt,
    updated_at:          p.updatedAt,
  }
}

export function serializeUser(
  u: DbUser & {
    profile?: DbProfile | null
    userRoles?: { role: DbRole }[]
  },
): User {
  return {
    id:                u.id,
    username:          u.username,
    email:             u.email,
    email_verified_at: u.emailVerifiedAt,
    is_active:         u.isActive,
    remember_token:    u.rememberToken,
    last_login_at:     u.lastLoginAt,
    created_at:        u.createdAt,
    updated_at:        u.updatedAt,
    deleted_at:        u.deletedAt,
    profile:           u.profile ? serializeProfile(u.profile) : undefined,
    roles:             u.userRoles?.map((ur) => serializeRole(ur.role)),
  }
}

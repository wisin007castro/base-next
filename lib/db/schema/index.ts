import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

const ts = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

// -------------------------------------------------------------------
// users
// -------------------------------------------------------------------
export const users = sqliteTable('users', {
  id:                     integer('id').primaryKey({ autoIncrement: true }),
  username:               text('username').notNull().unique(),
  email:                  text('email').notNull().unique(),
  emailVerifiedAt:        text('email_verified_at'),
  password:               text('password').notNull(),
  isActive:               integer('is_active', { mode: 'boolean' }).notNull().default(true),
  rememberToken:          text('remember_token'),
  lastLoginAt:            text('last_login_at'),
  // Password reset
  passwordResetToken:     text('password_reset_token'),
  passwordResetExpiresAt: text('password_reset_expires_at'),
  // 2FA / TOTP
  twoFactorSecret:        text('two_factor_secret'),
  twoFactorEnabled:       integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt:              text('created_at').notNull().default(ts()),
  updatedAt:              text('updated_at').notNull().default(ts()),
  deletedAt:              text('deleted_at'),
})

// -------------------------------------------------------------------
// user_profiles
// -------------------------------------------------------------------
export const userProfiles = sqliteTable('user_profiles', {
  id:                  integer('id').primaryKey({ autoIncrement: true }),
  userId:              integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  nombre:              text('nombre').notNull(),
  primerApellido:      text('primer_apellido'),
  segundoApellido:     text('segundo_apellido'),
  tipoDocumento:       text('tipo_documento').notNull(),
  numeroDocumento:     text('numero_documento').notNull(),
  fechaNacimiento:     text('fecha_nacimiento').notNull(),
  genero:              text('genero').notNull().default('prefiero_no_decir'),
  telefono:            text('telefono'),
  telefonoAlternativo: text('telefono_alternativo'),
  pais:                text('pais'),
  departamento:        text('departamento'),
  ciudad:              text('ciudad'),
  direccion:           text('direccion'),
  codigoPostal:        text('codigo_postal'),
  avatarKey:           text('avatar_key'),
  avatarUrl:           text('avatar_url'),
  avatarThumbKey:      text('avatar_thumb_key'),
  avatarThumbUrl:      text('avatar_thumb_url'),
  createdAt:           text('created_at').notNull().default(ts()),
  updatedAt:           text('updated_at').notNull().default(ts()),
})

// -------------------------------------------------------------------
// roles  (equivalente a tabla roles de Spatie)
// -------------------------------------------------------------------
export const roles = sqliteTable('roles', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull().unique(),
  description: text('description'),
  guardName:   text('guard_name').notNull().default('web'),
  createdAt:   text('created_at').notNull().default(ts()),
  updatedAt:   text('updated_at').notNull().default(ts()),
})

// -------------------------------------------------------------------
// permissions  (equivalente a tabla permissions de Spatie)
// -------------------------------------------------------------------
export const permissions = sqliteTable('permissions', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull().unique(), // e.g. 'users.create'
  description: text('description'),
  guardName:   text('guard_name').notNull().default('web'),
  createdAt:   text('created_at').notNull().default(ts()),
  updatedAt:   text('updated_at').notNull().default(ts()),
})

// -------------------------------------------------------------------
// model_has_roles → user_roles
// -------------------------------------------------------------------
export const userRoles = sqliteTable('user_roles', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.userId, t.roleId] })])

// -------------------------------------------------------------------
// model_has_permissions → user_permissions (permisos directos al usuario)
// -------------------------------------------------------------------
export const userPermissions = sqliteTable('user_permissions', {
  userId:       integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.userId, t.permissionId] })])

// -------------------------------------------------------------------
// role_has_permissions
// -------------------------------------------------------------------
export const rolePermissions = sqliteTable('role_permissions', {
  roleId:       integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })])

// -------------------------------------------------------------------
// user_sessions  — rastrea JWTs activos para gestión de sesiones
// -------------------------------------------------------------------
export const userSessions = sqliteTable('user_sessions', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  userId:      integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jti:         text('jti').notNull().unique(),  // JWT ID (uuid v4)
  userAgent:   text('user_agent'),
  ip:          text('ip'),
  createdAt:   text('created_at').notNull().default(ts()),
  lastUsedAt:  text('last_used_at').notNull().default(ts()),
  expiresAt:   text('expires_at').notNull(),
  revokedAt:   text('revoked_at'),             // null = sesión activa
})

// -------------------------------------------------------------------
// Relaciones
// -------------------------------------------------------------------
export const usersRelations = relations(users, ({ one, many }) => ({
  profile:         one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  userRoles:       many(userRoles),
  userPermissions: many(userPermissions),
  sessions:        many(userSessions),
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles:       many(userRoles),
  rolePermissions: many(rolePermissions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}))

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user:       one(users,       { fields: [userPermissions.userId],       references: [users.id] }),
  permission: one(permissions, { fields: [userPermissions.permissionId], references: [permissions.id] }),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role:       one(roles,       { fields: [rolePermissions.roleId],       references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}))

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}))

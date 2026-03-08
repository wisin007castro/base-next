/**
 * Seed de base de datos — equivalente a prisma/seed.ts
 * Uso: npm run db:seed
 */
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'

const db = drizzle(new Database('./dev.db'), { schema })

async function seed() {
  console.log('🌱 Iniciando seed...')

  // Limpiar en orden inverso por FK
  await db.delete(schema.userPermissions)
  await db.delete(schema.userRoles)
  await db.delete(schema.rolePermissions)
  await db.delete(schema.userProfiles)
  await db.delete(schema.users)
  await db.delete(schema.permissions)
  await db.delete(schema.roles)

  const now = new Date().toISOString()

  // -------------------------------------------------------------------
  // Permisos (igual que Spatie: 'recurso.accion')
  // -------------------------------------------------------------------
  const permDefs = [
    { name: 'users.view',        description: 'Ver listado de usuarios'      },
    { name: 'users.create',      description: 'Crear usuarios'               },
    { name: 'users.edit',        description: 'Editar usuarios'              },
    { name: 'users.delete',      description: 'Eliminar usuarios (soft)'     },
    { name: 'users.restore',     description: 'Restaurar usuarios eliminados'},
    { name: 'roles.manage',      description: 'Gestionar roles y permisos'   },
    { name: 'settings.view',     description: 'Ver configuración'            },
    { name: 'settings.edit',     description: 'Editar configuración'         },
  ]

  const insertedPerms = await db
    .insert(schema.permissions)
    .values(permDefs.map(p => ({ ...p, guardName: 'web', createdAt: now, updatedAt: now })))
    .returning()

  const perm = Object.fromEntries(insertedPerms.map(p => [p.name, p.id]))

  // -------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------
  const [adminRole, modRole, userRole] = await db
    .insert(schema.roles)
    .values([
      { name: 'admin',     description: 'Acceso total al sistema',           guardName: 'web', createdAt: now, updatedAt: now },
      { name: 'moderador', description: 'Gestión de contenido y usuarios',   guardName: 'web', createdAt: now, updatedAt: now },
      { name: 'usuario',   description: 'Acceso básico de solo lectura',     guardName: 'web', createdAt: now, updatedAt: now },
    ])
    .returning()

  // Permisos por rol
  await db.insert(schema.rolePermissions).values([
    // admin → todos los permisos
    ...insertedPerms.map(p => ({ roleId: adminRole.id, permissionId: p.id })),
    // moderador
    { roleId: modRole.id, permissionId: perm['users.view']    },
    { roleId: modRole.id, permissionId: perm['users.create']  },
    { roleId: modRole.id, permissionId: perm['users.edit']    },
    { roleId: modRole.id, permissionId: perm['users.delete']  },
    // usuario
    { roleId: userRole.id, permissionId: perm['users.view']   },
    { roleId: userRole.id, permissionId: perm['settings.view']},
  ])

  // -------------------------------------------------------------------
  // Usuarios
  // -------------------------------------------------------------------
  const password = await bcrypt.hash('password123', 12)

  const [admin, moderador, usuario] = await db
    .insert(schema.users)
    .values([
      { username: 'admin',     email: 'admin@ejemplo.com',     password, isActive: true, emailVerifiedAt: now, createdAt: now, updatedAt: now },
      { username: 'moderador', email: 'moderador@ejemplo.com', password, isActive: true, emailVerifiedAt: now, createdAt: now, updatedAt: now },
      { username: 'usuario1',  email: 'usuario@ejemplo.com',   password, isActive: true, createdAt: now, updatedAt: now },
    ])
    .returning()

  // Asignar roles
  await db.insert(schema.userRoles).values([
    { userId: admin.id,     roleId: adminRole.id },
    { userId: moderador.id, roleId: modRole.id   },
    { userId: usuario.id,   roleId: userRole.id  },
  ])

  // Perfiles
  await db.insert(schema.userProfiles).values([
    { userId: admin.id,     nombre: 'Carlos', primerApellido: 'García',   segundoApellido: 'López',  tipoDocumento: 'dni', numeroDocumento: '12345678A', fechaNacimiento: '1990-05-15', genero: 'masculino', telefono: '+34 600 111 222', pais: 'España', departamento: 'Madrid',    ciudad: 'Madrid',    direccion: 'Calle Mayor 1, 2º A', codigoPostal: '28001', createdAt: now, updatedAt: now },
    { userId: moderador.id, nombre: 'Laura',  primerApellido: 'Martínez', segundoApellido: null,     tipoDocumento: 'nie', numeroDocumento: 'X1234567B', fechaNacimiento: '1995-11-30', genero: 'femenino',  telefono: '+34 600 333 444', pais: 'España', departamento: 'Barcelona', ciudad: 'Barcelona', direccion: null,                  codigoPostal: '08001', createdAt: now, updatedAt: now },
    { userId: usuario.id,   nombre: 'Pedro',  primerApellido: 'Sánchez',  segundoApellido: 'Ruiz',   tipoDocumento: 'dni', numeroDocumento: '87654321B', fechaNacimiento: '2000-03-22', genero: 'masculino', telefono: null,             pais: 'España', departamento: 'Valencia',  ciudad: 'Valencia',  direccion: null,                  codigoPostal: null,    createdAt: now, updatedAt: now },
  ])

  console.log('✅ Seed completado:')
  console.log('   Roles:       admin, moderador, usuario')
  console.log('   Permisos:   ', permDefs.map(p => p.name).join(', '))
  console.log('   Usuarios:    admin@ejemplo.com | moderador@ejemplo.com | usuario@ejemplo.com')
  console.log('   Contraseña:  password123')
}

seed().catch((e) => {
  console.error('❌ Error en seed:', e)
  process.exit(1)
})

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

  // -------------------------------------------------------------------
  // 1 000 usuarios de prueba (sin foto) — en lotes para SQLite
  // -------------------------------------------------------------------
  const BATCH    = 100
  const TOTAL    = 1000
  const nombres  = ['Ana','Luis','María','Carlos','Sofía','Jorge','Elena','Pablo','Isabel','Diego','Lucía','Andrés','Marta','Sergio','Paula','Tomás','Nuria','Raúl','Beatriz','Iván','Silvia','Rubén','Patricia','Álvaro','Cristina','Marcos','Adriana','Hugo','Rosa','Héctor']
  const apellidos= ['García','Martínez','López','Sánchez','González','Pérez','Rodríguez','Fernández','Torres','Ramírez','Flores','Herrera','Moreno','Jiménez','Ruiz','Álvarez','Castro','Romero','Vega','Ortiz','Mendoza','Ríos','Delgado','Fuentes','Molina']
  const ciudades = ['Madrid','Barcelona','Valencia','Sevilla','Zaragoza','Málaga','Murcia','Palma','Bilbao','Valladolid','Alicante','Córdoba','Vigo','Gijón','Hospitalet']
  const docs     = ['dni','pasaporte','cedula','nie'] as const
  const generos  = ['masculino','femenino','otro','prefiero_no_decir'] as const
  const roles    = [adminRole, modRole, userRole]

  let created = 0
  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    const userValues = []
    for (let i = 0; i < BATCH; i++) {
      const n = batch * BATCH + i + 1
      userValues.push({
        username:       `test${n}`,
        email:          `test${n}@test.com`,
        password,
        isActive:       n % 10 !== 0,                         // 10% inactivos
        emailVerifiedAt: n % 5 === 0 ? null : now,            // 20% sin verificar
        createdAt: now,
        updatedAt: now,
      })
    }

    const insertedUsers = await db.insert(schema.users).values(userValues).returning()

    // Perfiles en lotes de 50 (SQLite param limit)
    const profileValues = insertedUsers.map((u, i) => {
      const n = batch * BATCH + i + 1
      return {
        userId:          u.id,
        nombre:          nombres[n % nombres.length],
        primerApellido:  apellidos[n % apellidos.length],
        segundoApellido: n % 3 === 0 ? apellidos[(n + 5) % apellidos.length] : null,
        tipoDocumento:   docs[n % docs.length],
        numeroDocumento: `TEST${String(n).padStart(7, '0')}`,
        fechaNacimiento: `${1970 + (n % 35)}-${String((n % 12) + 1).padStart(2, '0')}-${String((n % 28) + 1).padStart(2, '0')}`,
        genero:          generos[n % generos.length],
        telefono:        n % 4 === 0 ? null : `+34 6${String(n).padStart(8, '0').slice(0, 8)}`,
        pais:            'España',
        ciudad:          ciudades[n % ciudades.length],
        createdAt:       now,
        updatedAt:       now,
      }
    })
    for (let j = 0; j < profileValues.length; j += 50) {
      await db.insert(schema.userProfiles).values(profileValues.slice(j, j + 50))
    }

    // Roles — rotar entre los 3 roles
    const roleValues = insertedUsers.map((u, i) => ({
      userId: u.id,
      roleId: roles[(batch * BATCH + i) % roles.length].id,
    }))
    await db.insert(schema.userRoles).values(roleValues)

    created += insertedUsers.length
    process.stdout.write(`\r   Progreso: ${created}/${TOTAL} usuarios`)
  }
  console.log()

  console.log('✅ Seed completado:')
  console.log('   Roles:       admin, moderador, usuario')
  console.log('   Permisos:   ', permDefs.map(p => p.name).join(', '))
  console.log('   Usuarios:    admin@ejemplo.com | moderador@ejemplo.com | usuario@ejemplo.com')
  console.log(`   Test users:  test1@test.com … test${TOTAL}@test.com`)
  console.log('   Contraseña:  password123')
}

seed().catch((e) => {
  console.error('❌ Error en seed:', e)
  process.exit(1)
})

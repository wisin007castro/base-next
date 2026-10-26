/**
 * Datos de demostración para el blog: categorías, publicaciones, comentarios y votos.
 * Idempotente: si ya hay categorías no hace nada.
 *
 *   npm run db:seed:blog
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { count, eq, isNull } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sqlite = new Database(process.env.DATABASE_URL ?? './dev.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

const [{ total }] = db.select({ total: count() }).from(schema.categorias).all()
if (total > 0) {
  console.log('Ya hay categorías: no se insertan datos de demostración.')
  process.exit(0)
}

const userIds = db
  .select({ id: schema.users.id })
  .from(schema.users)
  .where(isNull(schema.users.deletedAt))
  .limit(20)
  .all()
  .map(u => u.id)
const admin = db
  .select({ id: schema.users.id })
  .from(schema.users)
  .innerJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
  .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
  .where(eq(schema.roles.name, 'admin'))
  .get()
if (!admin || userIds.length < 2) {
  console.log('Se necesita al menos un admin y otro usuario (npm run db:seed).')
  process.exit(1)
}

const pick = <T>(arr: T[], i: number) => arr[i % arr.length]

const cats = db
  .insert(schema.categorias)
  .values([
    { nombre: 'Anuncios', descripcion: 'Novedades del equipo y del producto' },
    { nombre: 'Tutoriales', descripcion: 'Guías paso a paso' },
    { nombre: 'Comunidad', descripcion: 'Historias y debates' },
    { nombre: 'Ingeniería', descripcion: 'Cómo construimos las cosas' },
  ])
  .returning({ id: schema.categorias.id })
  .all()

const posts = [
  ['Bienvenidos al nuevo blog', 'Estrenamos espacio para compartir novedades.', 0, true],
  ['Cómo crear un módulo CRUD en 1 minuto', 'gen:crud paso a paso: de la tabla a la UI.', 1, true],
  ['Filtros en la URL: por qué importan', 'Compartir, recargar y volver atrás sin perder el estado.', 3, true],
  ['TanStack Query sin misterios', 'Prefetch, keepPreviousData y actualizaciones optimistas.', 3, true],
  ['¿Qué funcionalidad te gustaría ver?', 'Cuéntanos en los comentarios.', 2, true],
  ['Formularios con react-hook-form y Zod', 'Una sola fuente de verdad para validar.', 1, true],
  ['Mantenimiento programado', 'El sábado habrá una ventana de mantenimiento.', 0, true],
  ['Borrador: roadmap del próximo trimestre', 'Aún no publicado: no debe verse en el blog.', 0, false],
] as const

const now = Date.now()
const created = db
  .insert(schema.publicaciones)
  .values(
    posts.map(([titulo, resumen, cat, publicada], i) => ({
      titulo,
      resumen,
      contenido: `${resumen}\n\nEste es el contenido completo de «${titulo}». Puedes votar a favor o en contra y dejar tu comentario más abajo.\n\nTexto de ejemplo generado por scripts/seed-blog.ts.`,
      categoriaId: cats[cat].id,
      publicada,
      fechaPublicacion: publicada ? new Date(now - i * 86_400_000 * 2).toISOString().slice(0, 10) : null,
      autorId: i % 3 === 0 ? admin.id : pick(userIds, i),
    })),
  )
  .returning({ id: schema.publicaciones.id, publicada: schema.publicaciones.publicada })
  .all()

const frases = [
  '¡Muy útil, gracias!',
  'No estoy de acuerdo con todo, pero buen punto.',
  '¿Habrá segunda parte?',
  'Lo probé y funciona perfecto.',
  'Me encantó la explicación.',
]
let comentarios = 0
let votos = 0
created
  .filter(p => p.publicada)
  .forEach((post, i) => {
    for (let c = 0; c < i % 4; c++) {
      db.insert(schema.comentarios)
        .values({ publicacionId: post.id, autorId: pick(userIds, i + c + 1), contenido: pick(frases, i + c) })
        .run()
      comentarios++
    }
    // Votos: varios usuarios distintos, mayoría a favor; la PK compuesta impide duplicados
    userIds.slice(0, 2 + ((i * 3) % 7)).forEach((userId, v) => {
      db.insert(schema.votos)
        .values({ publicacionId: post.id, userId, valor: (i + v) % 4 === 0 ? -1 : 1 })
        .run()
      votos++
    })
  })

console.log(
  `✔ Blog: ${cats.length} categorías, ${created.length} publicaciones (1 borrador), ${comentarios} comentarios, ${votos} votos.`,
)

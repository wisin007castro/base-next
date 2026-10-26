import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'
import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users, userSessions } from '@/lib/db/schema'
import { getUserRoles, getUserPermissions } from '@/lib/auth/rbac'
import { rateLimit } from '@/lib/api/rate-limiter'
import { verifyTotp } from '@/lib/auth/two-factor'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'auth' })

/** Llega al cliente como `res.code === 'rate_limited'` en signIn(). */
class RateLimitedError extends CredentialsSignin {
  code = 'rate_limited'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limiting: 5 intentos por email cada 15 minutos
        const email = credentials.email as string
        const { allowed } = rateLimit(`login:${email}`, 5, 15 * 60 * 1000)
        if (!allowed) {
          log.warn({ email }, 'login bloqueado por límite de intentos')
          throw new RateLimitedError()
        }

        const user = await db.query.users.findFirst({
          where: and(eq(users.email, email), eq(users.isActive, true), isNull(users.deletedAt)),
        })

        if (!user) {
          log.info({ email }, 'login fallido: usuario inexistente o inactivo')
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) {
          log.info({ userId: user.id }, 'login fallido: contraseña incorrecta')
          return null
        }

        // FEAT 7: si 2FA está habilitado, retornar pendiente sin roles
        if (user.twoFactorEnabled) {
          log.info({ userId: user.id }, 'login: contraseña correcta, falta el código 2FA')
          return {
            id: String(user.id),
            twoFactorPending: true,
          }
        }

        const [roles, perms] = await Promise.all([getUserRoles(user.id), getUserPermissions(user.id)])

        await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id))

        // FEAT 6: generar sid (session ID) e insertar sesión
        const sid = crypto.randomUUID()
        const userAgent = (request as Request | undefined)?.headers?.get('user-agent') ?? 'unknown'
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await db.insert(userSessions).values({
          userId: user.id,
          jti: sid,
          userAgent,
          ip: 'unknown',
          expiresAt,
          revokedAt: null,
        })

        log.info({ userId: user.id }, 'login correcto')
        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          roles,
          permissions: perms,
          sid,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger, session }) {
      // ---- signIn: primer token creado desde authorize ----
      if (trigger === 'signIn' && user) {
        const u = user as {
          id?: string
          roles?: string[]
          permissions?: string[]
          sid?: string
          twoFactorPending?: boolean
        }
        token.id = u.id

        if (u.twoFactorPending) {
          token.twoFactorPending = true
          // No añadir roles ni permisos hasta verificar 2FA
        } else {
          token.roles = u.roles ?? []
          token.permissions = u.permissions ?? []
          token.sid = u.sid
        }
        return token
      }

      // ---- update: completar el 2FA ----
      // El cliente manda el código, nunca un "ya verifiqué": `update()` acepta cualquier dato del
      // navegador, así que el código se comprueba aquí, en el servidor, antes de conceder la sesión.
      if (trigger === 'update' && token.twoFactorPending && typeof session?.twoFactorCode === 'string') {
        const userId = Number(token.id)
        if ((await verifyTotp(userId, session.twoFactorCode)) !== 'ok') {
          log.warn({ userId }, 'login 2FA: código rechazado al completar la sesión')
          return token
        }
        const [roles, perms] = await Promise.all([getUserRoles(userId), getUserPermissions(userId)])

        // Insertar sesión ahora que está verificado
        const sid = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await db.insert(userSessions).values({
          userId,
          jti: sid,
          userAgent: 'unknown',
          ip: 'unknown',
          expiresAt,
          revokedAt: null,
        })

        await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, userId))

        token.roles = roles
        token.permissions = perms
        token.sid = sid
        token.twoFactorPending = undefined
        log.info({ userId }, 'login correcto (2FA)')
        return token
      }

      // ---- cada request: verificar sid (session ID) si existe ----
      if (token.sid) {
        const sidStr = token.sid as string
        const sess = await db.query.userSessions.findFirst({
          where: eq(userSessions.jti, sidStr),
        })

        // Si la sesión no existe o fue revocada, forzar logout
        if (!sess || sess.revokedAt !== null) {
          return null
        }

        // Usuario desactivado o eliminado después de iniciar sesión → fuera
        const userId = Number(token.id)
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { isActive: true, deletedAt: true },
        })
        if (!user || !user.isActive || user.deletedAt) {
          log.info({ userId }, 'sesión cerrada: usuario desactivado o eliminado')
          return null
        }

        // Roles y permisos frescos: un cambio de rol aplica sin volver a iniciar sesión.
        // En API y páginas del servidor, al instante; el middleware (lee la cookie) cuando
        // la cookie se reescribe, es decir, en el siguiente refresco de useSession (foco de ventana).
        const [roles, perms] = await Promise.all([getUserRoles(userId), getUserPermissions(userId)])
        token.roles = roles
        token.permissions = perms

        // Actualizar lastUsedAt (fire-and-forget, sin bloquear)
        db.update(userSessions).set({ lastUsedAt: new Date().toISOString() }).where(eq(userSessions.jti, sidStr)).run()
      }

      return token
    },

    session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {
          roles?: string[]
          permissions?: string[]
          twoFactorPending?: boolean
          sid?: string
        }
        user.id = token.id as string
        user.roles = (token.roles as string[]) ?? []
        user.permissions = (token.permissions as string[]) ?? []
        user.twoFactorPending = token.twoFactorPending as boolean | undefined
        // Para marcar "Sesión actual" en /api/me/sessions (es un id, no una credencial)
        user.sid = token.sid as string | undefined
      }
      return session
    },
  },
})

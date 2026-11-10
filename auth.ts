import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'
import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users, userSessions } from '@/lib/db/schema'
import { getUserRoles, getUserPermissions } from '@/lib/auth/rbac'
import { rateLimit } from '@/lib/api/rate-limiter'
import { twoFactorSetupRequired, verifyTotp } from '@/lib/auth/two-factor'
import { logger } from '@/lib/logger'
import { consumeLoginCode } from '@/lib/auth/login-code'

const log = logger.child({ module: 'auth' })

/** Llega al cliente como `res.code === 'rate_limited'` en signIn(). */
class RateLimitedError extends CredentialsSignin {
  code = 'rate_limited'
}

type DbUser = typeof users.$inferSelect

/**
 * Tras comprobar la credencial (contraseña o código por correo): si tiene 2FA, sesión pendiente
 * sin roles; si no, roles, permisos y fila de sesión revocable.
 */
async function completeLogin(user: DbUser, request: Request | undefined, method: 'password' | 'code') {
  if (user.twoFactorEnabled) {
    log.info({ userId: user.id, method }, 'login: credencial correcta, falta el código 2FA')
    return { id: String(user.id), twoFactorPending: true }
  }

  const [roles, perms] = await Promise.all([getUserRoles(user.id), getUserPermissions(user.id)])
  await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id))

  // sid = fila en user_sessions (revocable desde el perfil)
  const sid = crypto.randomUUID()
  await db.insert(userSessions).values({
    userId: user.id,
    jti: sid,
    userAgent: request?.headers?.get('user-agent') ?? 'unknown',
    ip: 'unknown',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    revokedAt: null,
  })

  log.info({ userId: user.id, method }, 'login correcto')
  return {
    id: String(user.id),
    name: user.username,
    email: user.email,
    roles,
    permissions: perms,
    sid,
    twoFactorSetupRequired: await twoFactorSetupRequired(roles, false),
  }
}

/** 5 intentos por email cada 15 min, compartidos entre contraseña y código */
function checkRateLimit(email: string) {
  if (!rateLimit(`login:${email.toLowerCase()}`, 5, 15 * 60 * 1000).allowed) {
    log.warn({ email }, 'login bloqueado por límite de intentos')
    throw new RateLimitedError()
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        checkRateLimit(email)

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

        return completeLogin(user, request as Request | undefined, 'password')
      },
    }),
    // Código de 6 dígitos enviado por correo (si está activado en Configuración → Acceso)
    Credentials({
      id: 'login-code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Código', type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.code) return null
        const email = credentials.email as string
        checkRateLimit(email)

        const user = await consumeLoginCode(email, String(credentials.code).trim())
        if (!user) return null
        return completeLogin(user, request as Request | undefined, 'code')
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
          twoFactorSetupRequired?: boolean
        }
        token.id = u.id

        if (u.twoFactorPending) {
          token.twoFactorPending = true
          // No añadir roles ni permisos hasta verificar 2FA
        } else {
          token.roles = u.roles ?? []
          token.permissions = u.permissions ?? []
          token.sid = u.sid
          token.twoFactorSetupRequired = u.twoFactorSetupRequired
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
          columns: { isActive: true, deletedAt: true, twoFactorEnabled: true },
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
        // Política de 2FA obligatorio (Configuración → Acceso): se recalcula al activar 2FA o cambiar rol
        token.twoFactorSetupRequired = await twoFactorSetupRequired(roles, user.twoFactorEnabled)

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
          twoFactorSetupRequired?: boolean
          sid?: string
        }
        user.id = token.id as string
        user.roles = (token.roles as string[]) ?? []
        user.permissions = (token.permissions as string[]) ?? []
        user.twoFactorPending = token.twoFactorPending as boolean | undefined
        user.twoFactorSetupRequired = token.twoFactorSetupRequired as boolean | undefined
        // Para marcar "Sesión actual" en /api/me/sessions (es un id, no una credencial)
        user.sid = token.sid as string | undefined
      }
      return session
    },
  },
})

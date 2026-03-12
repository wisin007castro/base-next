import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'
import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users, userSessions } from '@/lib/db/schema'
import { getUserRoles, getUserPermissions } from '@/lib/auth/rbac'
import { rateLimit } from '@/lib/api/rate-limiter'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',      type: 'email'    },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limiting: 5 intentos por email cada 15 minutos
        const email = credentials.email as string
        const { allowed } = rateLimit(`login:${email}`, 5, 15 * 60 * 1000)
        if (!allowed) return null

        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, email),
            eq(users.isActive, true),
            isNull(users.deletedAt),
          ),
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        )
        if (!valid) return null

        // FEAT 7: si 2FA está habilitado, retornar pendiente sin roles
        if (user.twoFactorEnabled) {
          return {
            id:               String(user.id),
            twoFactorPending: true,
          }
        }

        const [roles, perms] = await Promise.all([
          getUserRoles(user.id),
          getUserPermissions(user.id),
        ])

        await db
          .update(users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(users.id, user.id))

        // FEAT 6: generar jti e insertar sesión
        const jti       = crypto.randomUUID()
        const userAgent = (request as Request | undefined)
          ?.headers?.get('user-agent') ?? 'unknown'
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await db.insert(userSessions).values({
          userId:    user.id,
          jti,
          userAgent,
          ip:        'unknown',
          expiresAt,
          revokedAt: null,
        })

        return {
          id:          String(user.id),
          name:        user.username,
          email:       user.email,
          roles,
          permissions: perms,
          jti,
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
          jti?: string
          twoFactorPending?: boolean
        }
        token.id = u.id

        if (u.twoFactorPending) {
          token.twoFactorPending = true
          // No añadir roles ni permisos hasta verificar 2FA
        } else {
          token.roles       = u.roles       ?? []
          token.permissions = u.permissions ?? []
          token.jti         = u.jti
        }
        return token
      }

      // ---- update: 2FA verificado ----
      if (trigger === 'update' && session?.twoFactorVerified === true) {
        const userId = Number(token.id)
        const [roles, perms] = await Promise.all([
          getUserRoles(userId),
          getUserPermissions(userId),
        ])

        // Insertar sesión ahora que está verificado
        const jti       = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await db.insert(userSessions).values({
          userId,
          jti,
          userAgent: 'unknown',
          ip:        'unknown',
          expiresAt,
          revokedAt: null,
        })

        await db
          .update(users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(users.id, userId))

        token.roles            = roles
        token.permissions      = perms
        token.jti              = jti
        token.twoFactorPending = undefined
        return token
      }

      // ---- cada request: verificar jti si existe ----
      if (token.jti) {
        const jtiStr = token.jti as string
        const sess = await db.query.userSessions.findFirst({
          where: eq(userSessions.jti, jtiStr),
        })

        // Si la sesión no existe o fue revocada, forzar logout
        if (!sess || sess.revokedAt !== null) {
          return null
        }

        // Actualizar lastUsedAt (fire-and-forget, sin bloquear)
        db.update(userSessions)
          .set({ lastUsedAt: new Date().toISOString() })
          .where(eq(userSessions.jti, jtiStr))
          .run()
      }

      return token
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as {
          roles?: string[]
          permissions?: string[]
          twoFactorPending?: boolean
        }).roles            = token.roles       as string[] ?? []
        ;(session.user as {
          roles?: string[]
          permissions?: string[]
          twoFactorPending?: boolean
        }).permissions      = token.permissions as string[] ?? []
        ;(session.user as {
          roles?: string[]
          permissions?: string[]
          twoFactorPending?: boolean
        }).twoFactorPending = token.twoFactorPending as boolean | undefined
      }
      return session
    },
  },
})

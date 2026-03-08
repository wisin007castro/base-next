import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'
import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getUserRoles, getUserPermissions } from '@/lib/auth/rbac'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',      type: 'email'    },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, credentials.email as string),
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

        const [roles, perms] = await Promise.all([
          getUserRoles(user.id),
          getUserPermissions(user.id),
        ])

        await db
          .update(users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(users.id, user.id))

        return {
          id:          String(user.id),
          name:        user.username,
          email:       user.email,
          roles,
          permissions: perms,
        }
      },
    }),
  ],
})

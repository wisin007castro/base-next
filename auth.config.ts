import type { NextAuthConfig } from 'next-auth'

/**
 * Config Edge-compatible (sin imports de Node.js nativos).
 * Usada en middleware.ts para proteger rutas sin tocar la DB.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPaths = ['/usuarios']
      const isProtected = protectedPaths.some((p) =>
        nextUrl.pathname.startsWith(p),
      )
      if (isProtected && !isLoggedIn) return false
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id          = user.id
        token.roles       = (user as { roles?: string[] }).roles       ?? []
        token.permissions = (user as { permissions?: string[] }).permissions ?? []
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { roles?: string[]; permissions?: string[] }).roles       = token.roles as string[]
        ;(session.user as { roles?: string[]; permissions?: string[] }).permissions = token.permissions as string[]
      }
      return session
    },
  },
  providers: [], // los providers se agregan en auth.ts (Node.js)
}

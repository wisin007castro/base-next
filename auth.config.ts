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
      const userRoles  = ((auth?.user as { roles?: string[] })?.roles) ?? []
      const isAdmin    = userRoles.includes('admin')

      const adminPaths = ['/usuarios', '/roles', '/permisos']
      const userPaths  = ['/perfil']

      const isAdminPath = adminPaths.some((p) => nextUrl.pathname.startsWith(p))
      const isUserPath  = userPaths.some((p)  => nextUrl.pathname.startsWith(p))

      // Sin sesión → login
      if ((isAdminPath || isUserPath) && !isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl))
      }

      // Con sesión pero sin rol admin → home
      if (isAdminPath && !isAdmin) {
        return Response.redirect(new URL('/', nextUrl))
      }

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

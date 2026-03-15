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
      const twoFactorPending = !!(auth?.user as { twoFactorPending?: boolean })?.twoFactorPending

      const adminPaths    = ['/usuarios', '/roles', '/permisos']
      const userPaths     = ['/perfil']
      const authPaths     = ['/']                              // home sólo autenticados
      const publicPaths   = ['/login', '/forgot-password', '/reset-password']

      const isAdminPath  = adminPaths.some((p) => nextUrl.pathname.startsWith(p))
      const isUserPath   = userPaths.some((p)  => nextUrl.pathname.startsWith(p))
      const isAuthPath   = authPaths.some((p)  => nextUrl.pathname === p)
      const isPublicPath = publicPaths.some((p) => nextUrl.pathname.startsWith(p))
      const is2faPath    = nextUrl.pathname.startsWith('/verify-2fa')

      // FEAT 7: si 2FA está pendiente, redirigir a /verify-2fa (excepto si ya está ahí)
      if (isLoggedIn && twoFactorPending && !is2faPath) {
        return Response.redirect(new URL('/verify-2fa', nextUrl))
      }

      // Si 2FA pendiente y está en /verify-2fa, permitir
      if (isLoggedIn && twoFactorPending && is2faPath) {
        return true
      }

      // Sin sesión → login
      if ((isAdminPath || isUserPath || isAuthPath) && !isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl))
      }

      // Sesión activa intentando ir a login/registro → redirigir a home
      if (isLoggedIn && isPublicPath) {
        return Response.redirect(new URL('/', nextUrl))
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

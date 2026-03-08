import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Excluir archivos estáticos y rutas internas de Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}

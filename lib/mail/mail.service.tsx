import type { ReactElement } from 'react'
import { render } from '@react-email/render'
import { env } from '@/lib/env'
import { transporter } from './mail.client'
import type { Branding } from './templates/EmailLayout'
import {
  AccountVerifiedEmail,
  InvitationEmail,
  LoginCodeEmail,
  PasswordResetEmail,
  TestEmail,
  VerificationLinkEmail,
} from './templates'

/** Nombre y logo que firman los correos */
async function branding(): Promise<Branding> {
  return { appName: 'Panel', logoUrl: null }
}

/** Renderiza la plantilla (HTML + texto plano, para clientes sin HTML y filtros de spam) y la envía */
async function send(to: string, subject: string, email: ReactElement) {
  const [html, text] = await Promise.all([render(email), render(email, { plainText: true })])
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, text })
}

const url = (path: string) => `${env.NEXTAUTH_URL}${path}`

export async function sendVerificationLinkEmail(to: string, username: string, token: string) {
  const b = await branding()
  await send(
    to,
    'Verifica tu correo electrónico',
    <VerificationLinkEmail branding={b} username={username} url={url(`/api/verify-email?token=${token}`)} />,
  )
}

export async function sendVerificationEmail(to: string, username: string) {
  const b = await branding()
  await send(
    to,
    'Tu cuenta está verificada',
    <AccountVerifiedEmail branding={b} username={username} loginUrl={url('/login')} />,
  )
}

export async function sendPasswordResetEmail(to: string, username: string, token: string) {
  const b = await branding()
  await send(
    to,
    'Restablece tu contraseña',
    <PasswordResetEmail branding={b} username={username} url={url(`/reset-password?token=${token}`)} />,
  )
}

export async function sendInvitationEmail(
  to: string,
  data: { token: string; invitedBy?: string | null; roles: string[]; expiresAt: string },
) {
  const b = await branding()
  await send(
    to,
    `Invitación a ${b.appName}`,
    <InvitationEmail
      branding={b}
      url={url(`/invitacion?token=${data.token}`)}
      invitedBy={data.invitedBy}
      roles={data.roles}
      expiresAt={data.expiresAt}
    />,
  )
}

export async function sendLoginCodeEmail(to: string, code: string, minutes: number) {
  const b = await branding()
  await send(to, `${code} es tu código de acceso`, <LoginCodeEmail branding={b} code={code} minutes={minutes} />)
}

export async function sendTestEmail(to: string) {
  const b = await branding()
  await send(to, `Correo de prueba de ${b.appName}`, <TestEmail branding={b} />)
}

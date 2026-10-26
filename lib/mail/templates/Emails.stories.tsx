import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useEffect, useState, type ReactElement } from 'react'
import { render } from '@react-email/render'
import {
  AccountVerifiedEmail,
  InvitationEmail,
  LoginCodeEmail,
  PasswordResetEmail,
  TestEmail,
  VerificationLinkEmail,
} from '.'

const branding = { appName: 'Panel de administración', logoUrl: null }
const url = 'http://localhost:3005/ejemplo?token=abc123'

/** Vista previa del HTML final (el mismo render que usa mail.service) en un iframe */
function EmailPreview({ email }: { email: ReactElement }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    render(email).then(setHtml)
  }, [email])
  // Estilos en línea: Tailwind no escanea lib/ (no generaría h-[640px])
  return (
    <iframe
      title="Correo"
      srcDoc={html}
      style={{
        width: '100%',
        maxWidth: 680,
        height: 640,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#fff',
      }}
    />
  )
}

const meta: Meta<typeof EmailPreview> = {
  title: 'Correos',
  component: EmailPreview,
  parameters: { docs: { description: { component: 'Plantillas react-email de `lib/mail/templates`.' } } },
}
export default meta
type Story = StoryObj<typeof EmailPreview>

export const Invitacion: Story = {
  args: {
    email: (
      <InvitationEmail
        branding={branding}
        url={url}
        invitedBy="admin"
        roles={['editor']}
        expiresAt={new Date(Date.now() + 7 * 86_400_000).toISOString()}
      />
    ),
  },
}
export const CodigoDeAcceso: Story = {
  args: { email: <LoginCodeEmail branding={branding} code="482913" minutes={10} /> },
}
export const VerificarCorreo: Story = {
  args: { email: <VerificationLinkEmail branding={branding} username="ana" url={url} /> },
}
export const CuentaVerificada: Story = {
  args: { email: <AccountVerifiedEmail branding={branding} username="ana" loginUrl={url} /> },
}
export const RecuperarContrasena: Story = {
  args: { email: <PasswordResetEmail branding={branding} username="ana" url={url} /> },
}
export const Prueba: Story = { args: { email: <TestEmail branding={branding} /> } }

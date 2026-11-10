import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailLayout, type Branding } from './EmailLayout'
import { styles } from './styles'

/**
 * Plantillas de correo (react-email). Cada una recibe `branding` y sus datos; mail.service
 * las renderiza a HTML + texto plano. Vista previa: renderiza con `render()` y ábrelo, o usa
 * Configuración → Correo → "Enviar correo de prueba".
 */

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function ActionButton({ href, children }: { href: string; children: string }) {
  return (
    <>
      <Section style={{ margin: '24px 0' }}>
        <Button href={href} style={styles.button}>
          {children}
        </Button>
      </Section>
      <Text style={styles.muted}>
        Si el botón no funciona, copia este enlace en el navegador:
        <br />
        <a href={href} style={styles.link}>
          {href}
        </a>
      </Text>
    </>
  )
}

export function InvitationEmail(p: {
  branding: Branding
  url: string
  invitedBy?: string | null
  roles: string[]
  expiresAt: string
}) {
  return (
    <EmailLayout preview={`Te invitaron a ${p.branding.appName}`} branding={p.branding}>
      <Heading style={styles.h1}>Te invitaron a {p.branding.appName}</Heading>
      <Text style={styles.text}>
        {p.invitedBy ? `${p.invitedBy} te invitó` : 'Te invitaron'} a crear una cuenta
        {p.roles.length ? ` con el rol ${p.roles.join(', ')}` : ''}. Elige tu usuario y contraseña para empezar.
      </Text>
      <ActionButton href={p.url}>Aceptar invitación</ActionButton>
      <Text style={styles.muted}>La invitación caduca el {fmtDate(p.expiresAt)}.</Text>
    </EmailLayout>
  )
}

export function VerificationLinkEmail(p: { branding: Branding; username: string; url: string }) {
  return (
    <EmailLayout preview="Verifica tu correo electrónico" branding={p.branding}>
      <Heading style={styles.h1}>Hola, {p.username}</Heading>
      <Text style={styles.text}>Un administrador te envió un enlace para verificar tu cuenta.</Text>
      <ActionButton href={p.url}>Verificar mi cuenta</ActionButton>
      <Text style={styles.muted}>El enlace caduca en 24 horas.</Text>
    </EmailLayout>
  )
}

export function AccountVerifiedEmail(p: { branding: Branding; username: string; loginUrl: string }) {
  return (
    <EmailLayout preview="Tu cuenta está verificada" branding={p.branding}>
      <Heading style={styles.h1}>Hola, {p.username}</Heading>
      <Text style={styles.text}>Un administrador verificó tu cuenta. Ya puedes iniciar sesión.</Text>
      <ActionButton href={p.loginUrl}>Iniciar sesión</ActionButton>
    </EmailLayout>
  )
}

export function PasswordResetEmail(p: { branding: Branding; username: string; url: string }) {
  return (
    <EmailLayout preview="Restablece tu contraseña" branding={p.branding}>
      <Heading style={styles.h1}>Hola, {p.username}</Heading>
      <Text style={styles.text}>Recibimos una solicitud para restablecer tu contraseña.</Text>
      <ActionButton href={p.url}>Restablecer contraseña</ActionButton>
      <Text style={styles.muted}>El enlace caduca en 1 hora. Si no lo pediste tú, ignora este correo.</Text>
    </EmailLayout>
  )
}

export function LoginCodeEmail(p: { branding: Branding; code: string; minutes: number }) {
  return (
    <EmailLayout preview={`Tu código de acceso: ${p.code}`} branding={p.branding}>
      <Heading style={styles.h1}>Tu código de acceso</Heading>
      <Text style={styles.text}>Escríbelo en la pantalla de inicio de sesión:</Text>
      <Text style={styles.code}>{p.code}</Text>
      <Text style={styles.muted}>
        Caduca en {p.minutes} minutos. Si no intentaste iniciar sesión, ignora este correo: sin el código nadie puede
        entrar.
      </Text>
    </EmailLayout>
  )
}

export function TestEmail(p: { branding: Branding }) {
  return (
    <EmailLayout preview="Correo de prueba" branding={p.branding}>
      <Heading style={styles.h1}>Correo de prueba</Heading>
      <Text style={styles.text}>Si lees esto, la configuración de correo funciona.</Text>
    </EmailLayout>
  )
}

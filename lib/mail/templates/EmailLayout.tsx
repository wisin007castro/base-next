import type { ReactNode } from 'react'
import { Body, Container, Head, Hr, Html, Img, Preview, Text } from '@react-email/components'
import { styles } from './styles'

export interface Branding {
  appName: string
  /** URL absoluta del logo (los clientes de correo no resuelven rutas relativas) */
  logoUrl?: string | null
}

/** Marco común: nombre/logo del sistema, contenido y pie */
export function EmailLayout({
  preview,
  branding,
  children,
}: {
  /** Texto que el cliente de correo muestra junto al asunto */
  preview: string
  branding: Branding
  children: ReactNode
}) {
  return (
    <Html lang="es">
      <Head>
        <meta name="viewport" content="width=device-width" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {branding.logoUrl ? (
            <Img src={branding.logoUrl} alt={branding.appName} height="32" style={{ marginBottom: '24px' }} />
          ) : (
            <Text style={styles.brand}>{branding.appName.toUpperCase()}</Text>
          )}
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.muted}>
            Mensaje automático de {branding.appName}. Si no esperabas este correo, puedes ignorarlo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

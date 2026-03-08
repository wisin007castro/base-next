import { transporter } from './mail.client'

const FROM = process.env.MAIL_FROM ?? 'noreply@localhost'

export async function sendVerificationEmail(to: string, username: string) {
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: 'Verifica tu cuenta',
    html: `
      <h2>Hola, ${username}</h2>
      <p>Tu cuenta ha sido verificada manualmente por un administrador.</p>
      <p>Ya puedes iniciar sesión en la plataforma.</p>
    `,
  })
}

export async function sendWelcomeEmail(to: string, username: string) {
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: '¡Bienvenido a la plataforma!',
    html: `
      <h2>¡Bienvenido, ${username}!</h2>
      <p>Tu cuenta ha sido creada exitosamente.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, username: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: 'Restablece tu contraseña',
    html: `
      <h2>Hola, ${username}</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${resetUrl}">Haz clic aquí para restablecerla</a></p>
      <p>Si no solicitaste esto, ignora este mensaje.</p>
      <p>El enlace expira en 1 hora.</p>
    `,
  })
}

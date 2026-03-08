import { transporter } from './mail.client'

const FROM = process.env.MAIL_FROM ?? 'noreply@localhost'

export async function sendVerificationLinkEmail(to: string, username: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: 'Verifica tu correo electrónico',
    html: `
      <h2>Hola, ${username}</h2>
      <p>Un administrador te ha enviado un enlace para verificar tu cuenta.</p>
      <p>
        <a href="${url}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px">
          Verificar mi cuenta
        </a>
      </p>
      <p style="color:#888;font-size:12px">El enlace expira en 24 horas.</p>
      <p style="color:#888;font-size:12px">O copiá este enlace: ${url}</p>
    `,
  })
}

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

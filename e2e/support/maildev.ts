import { expect } from '@playwright/test'

/** API REST de MailDev (UI web). Local: puerto del registro (1081); CI: servicio en 1080. */
const MAILDEV = process.env.E2E_MAILDEV_URL ?? 'http://localhost:1081'

interface Mail {
  id: string
  subject: string
  html: string
  text: string
  to: { address: string }[]
}

/** Espera el último correo enviado a `to` (los envíos son asíncronos) y lo borra de MailDev */
export async function waitForMail(to: string): Promise<Mail> {
  let mail: Mail | undefined
  await expect
    .poll(
      async () => {
        const all = (await (await fetch(`${MAILDEV}/email`)).json()) as Mail[]
        mail = all.filter(m => m.to.some(t => t.address.toLowerCase() === to.toLowerCase())).at(-1)
        return !!mail
      },
      { message: `correo para ${to} en MailDev (${MAILDEV})`, timeout: 15_000 },
    )
    .toBe(true)
  await fetch(`${MAILDEV}/email/${mail!.id}`, { method: 'DELETE' })
  return mail!
}

/** Primer enlace del correo que contenga `path` (p. ej. '/invitacion') */
export function linkFrom(mail: Mail, path: string): string {
  const url = mail.html.match(new RegExp(`href="([^"]*${path}[^"]*)"`))?.[1]
  if (!url) throw new Error(`El correo "${mail.subject}" no tiene enlace a ${path}`)
  return url.replace(/&amp;/g, '&')
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'
import { getSettings, saveSettings } from '@/lib/settings'
import {
  accessSettingsSchema,
  mailSettingsInputSchema,
  systemSettingsSchema,
  type MailSettingsView,
} from '@/lib/settings/schemas'
import { encryptSecret } from '@/lib/settings/secrets'

type Params = { params: Promise<{ section: string }> }

const notFound = () => NextResponse.json({ message: 'Sección no encontrada' }, { status: 404 })
const invalid = (errors: unknown) => NextResponse.json({ message: 'Datos inválidos', errors }, { status: 422 })

async function view(section: string) {
  if (section === 'system') return getSettings('system')
  if (section === 'access') return getSettings('access')
  if (section === 'mail') {
    const { passEncrypted, ...rest } = await getSettings('mail')
    const mail: MailSettingsView = { ...rest, hasPassword: !!passEncrypted }
    return mail
  }
  return null
}

// GET /api/settings/:section — system | access | mail (la contraseña SMTP nunca sale)
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard
  const data = await view((await params).section)
  return data ? NextResponse.json(data) : notFound()
}

// PUT /api/settings/:section — reemplaza la sección completa
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (isGuardError(guard)) return guard
  const userId = Number(guard.user.id)
  const { section } = await params
  const body = await req.json().catch(() => null)

  if (section === 'system') {
    const parsed = systemSettingsSchema.safeParse(body)
    if (!parsed.success) return invalid(parsed.error.flatten())
    await saveSettings('system', parsed.data, userId)
  } else if (section === 'access') {
    const parsed = accessSettingsSchema.safeParse(body)
    if (!parsed.success) return invalid(parsed.error.flatten())
    await saveSettings('access', parsed.data, userId)
  } else if (section === 'mail') {
    const parsed = mailSettingsInputSchema.safeParse(body)
    if (!parsed.success) return invalid(parsed.error.flatten())
    const { pass, clearPass, ...rest } = parsed.data
    const current = await getSettings('mail')
    // pass vacío = conservar la guardada (el formulario nunca la recibe)
    const passEncrypted = clearPass ? null : pass ? encryptSecret(pass) : (current.passEncrypted ?? null)
    await saveSettings('mail', { ...rest, passEncrypted }, userId)
  } else {
    return notFound()
  }

  return NextResponse.json(await view(section))
}

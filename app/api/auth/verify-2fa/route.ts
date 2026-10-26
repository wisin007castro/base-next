import { NextRequest, NextResponse } from 'next/server'
import { requireAuthPending, isGuardError } from '@/lib/api/api-guard'
import { enableTwoFactorSchema } from '@/lib/api/schemas/user.schema'
import { verifyTotp } from '@/lib/auth/two-factor'

// POST /api/auth/verify-2fa — comprueba el código TOTP para dar un error claro en el formulario.
// No concede la sesión: eso lo hace el callback jwt al recibir update({ twoFactorCode }),
// que vuelve a verificar el código en el servidor.
export async function POST(req: NextRequest) {
  const guard = await requireAuthPending()
  if (isGuardError(guard)) return guard

  const parsed = enableTwoFactorSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
  }

  const result = await verifyTotp(Number(guard.user.id), parsed.data.code)
  if (result === 'rate_limited') {
    return NextResponse.json({ message: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  }
  if (result === 'not_configured') {
    return NextResponse.json({ message: 'Usuario sin 2FA configurado' }, { status: 400 })
  }
  if (result === 'invalid') {
    return NextResponse.json(
      { message: 'Código incorrecto', errors: { formErrors: [], fieldErrors: { code: ['Código incorrecto'] } } },
      { status: 422 },
    )
  }

  return NextResponse.json({ message: 'OK' })
}

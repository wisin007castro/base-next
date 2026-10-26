import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'

// GET /api/settings/public — nombre y logo del sistema (sidebar, cabecera, login). Público: no
// expone nada que no se vea en pantalla.
export async function GET() {
  const { systemName, logoUrl } = await getSettings('system')
  const { loginCodeEnabled } = await getSettings('access')
  return NextResponse.json({ systemName, logoUrl, loginCodeEnabled })
}

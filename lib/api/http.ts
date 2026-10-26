// API interna de Next.js — misma app, misma URL
const API_BASE = '/api'

// -------------------------------------------------------------------
// ApiError — permite trasladar errores de campo del servidor al form
// y decidir reintentos según el status HTTP
// -------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly formErrors: string[] = [],
    public readonly status: number = 0,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// -------------------------------------------------------------------
// Helper — `init.signal` permite que TanStack Query cancele la petición
// -------------------------------------------------------------------
export async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  })

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string
      errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
    }
    throw new ApiError(
      error.message ?? 'Error en la petición',
      error.errors?.fieldErrors ?? {},
      error.errors?.formErrors ?? [],
      res.status,
    )
  }

  // 204 No Content (DELETE) no trae body: res.json() lanzaría
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

/** Objeto de filtros → `?a=1&b=x` (omite undefined, null y '') */
export function toQueryString(params: object): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const str = qs.toString()
  return str ? `?${str}` : ''
}

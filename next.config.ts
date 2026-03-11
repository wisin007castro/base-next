import type { NextConfig } from 'next'

// ── Storage origin dinámico ─────────────────────────────────────────────────
// Lee STORAGE_ENDPOINT del entorno para que next.config respete los puertos
// definidos en .env.local sin tener que cambiar este archivo.
const storageEndpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000'
const storageUrl      = new URL(storageEndpoint)
const storageProtocol = storageUrl.protocol.replace(':', '') as 'http' | 'https'
const storageHostname = storageUrl.hostname          // 'localhost' | '127.0.0.1' | ...
const storagePort     = storageUrl.port || (storageProtocol === 'https' ? '443' : '80')
const storageOrigin   = storageUrl.origin            // ej. http://localhost:9000

// ── Security headers ────────────────────────────────────────────────────────
const securityHeaders = [
  // Evita que la página se cargue en iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Desactiva el sniffing de MIME type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controla la información de referrer enviada a otros sitios
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Limita las APIs del navegador disponibles
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Fuerza HTTPS en producción (1 año)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Política básica de CSP: permite recursos propios + MinIO (puerto dinámico)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval requerido por Next.js dev
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${storageOrigin}`,
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // MinIO — puerto leído desde STORAGE_ENDPOINT (.env / .env.local)
        protocol: storageProtocol,
        hostname: storageHostname,
        port:     storagePort,
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Aplicar a todas las rutas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

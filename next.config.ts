import type { NextConfig } from 'next'

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
  // Política básica de CSP: permite recursos propios + MinIO local en dev
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval requerido por Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http://localhost:9000 http://127.0.0.1:9000",
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
        // MinIO local — desarrollo
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
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

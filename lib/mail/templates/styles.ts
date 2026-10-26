import type { CSSProperties } from 'react'

// Los clientes de correo no leen CSS externo ni variables: estilos en línea, colores fijos
// (los del tema claro de la app: --accent #0284c7)
const ACCENT = '#0284c7'

export const styles = {
  main: {
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '24px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '520px',
    padding: '32px',
  },
  brand: { color: ACCENT, fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 24px' },
  h1: { color: '#0f172a', fontSize: '20px', fontWeight: 600, margin: '0 0 16px' },
  text: { color: '#334155', fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' },
  muted: { color: '#64748b', fontSize: '12px', lineHeight: '18px', margin: '16px 0 0' },
  button: {
    backgroundColor: ACCENT,
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 20px',
    textDecoration: 'none',
  },
  code: {
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    color: '#0f172a',
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '0.3em',
    padding: '12px 20px',
    textAlign: 'center',
  },
  link: { color: ACCENT, wordBreak: 'break-all' },
  hr: { borderColor: '#e2e8f0', margin: '24px 0 16px' },
} satisfies Record<string, CSSProperties>

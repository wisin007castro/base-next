import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from './secrets'

describe('secretos cifrados (contraseña SMTP)', () => {
  it('cifra y descifra', () => {
    const enc = encryptSecret('contraseña-smtp')
    expect(enc).not.toContain('contraseña')
    expect(decryptSecret(enc)).toBe('contraseña-smtp')
  })

  it('cada cifrado es distinto (IV aleatorio)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'))
  })

  it('un valor manipulado no se descifra (GCM autentica)', () => {
    const [v, iv, tag, data] = encryptSecret('secreto').split('.')
    const flipped = data.slice(0, -2) + (data.at(-2) === 'A' ? 'B' : 'A') + data.at(-1)
    expect(decryptSecret([v, iv, tag, flipped].join('.'))).toBeNull()
  })

  it('formato desconocido → null, sin lanzar', () => {
    expect(decryptSecret('basura')).toBeNull()
    expect(decryptSecret('v2.a.b.c')).toBeNull()
  })
})

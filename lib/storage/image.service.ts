import sharp from 'sharp'

export interface ProcessedAvatar {
  full:  { buffer: Buffer; key: string; contentType: string }
  thumb: { buffer: Buffer; key: string; contentType: string }
}

const FULL_SIZE  = 512  // px — imagen principal
const THUMB_SIZE = 80   // px — miniatura para listados y header
const QUALITY    = 85

/**
 * Procesa una imagen de avatar y genera dos versiones WebP:
 *  - full:  512×512 recortada al centro
 *  - thumb:  80×80  recortada al centro
 * Ambas eliminan metadatos EXIF.
 */
export async function processAvatar(input: Buffer, userId: number): Promise<ProcessedAvatar> {
  const base = sharp(input).rotate() // rotate() respeta el EXIF de orientación antes de quitarlo

  const [fullBuffer, thumbBuffer] = await Promise.all([
    base.clone()
      .resize(FULL_SIZE, FULL_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY })
      .withMetadata({ exif: {} }) // elimina EXIF (privacidad)
      .toBuffer(),

    base.clone()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY })
      .withMetadata({ exif: {} })
      .toBuffer(),
  ])

  return {
    full: {
      buffer:      fullBuffer,
      key:         `avatars/${userId}.webp`,
      contentType: 'image/webp',
    },
    thumb: {
      buffer:      thumbBuffer,
      key:         `avatars/${userId}_thumb.webp`,
      contentType: 'image/webp',
    },
  }
}

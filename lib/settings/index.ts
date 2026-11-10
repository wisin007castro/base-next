import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { logger } from '@/lib/logger'
import { SETTINGS, type SettingsKey, type SettingsValue } from './schemas'

/**
 * Configuración guardada en la tabla `settings`, con caché en memoria (se lee en cada petición
 * autenticada y en cada correo). La caché caduca a los pocos segundos: un cambio hecho por otra
 * instancia del servidor o directamente en la BD se ve enseguida sin reiniciar.
 * Un valor ilegible o de una versión anterior se completa con los valores por defecto.
 */
const TTL_MS = 10_000
const g = globalThis as unknown as { _settingsCache?: Map<SettingsKey, { value: unknown; at: number }> }
const cache = (g._settingsCache ??= new Map())

export async function getSettings<K extends SettingsKey>(key: K): Promise<SettingsValue[K]> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as SettingsValue[K]

  const { defaults } = SETTINGS[key]
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) })
  let value = defaults as SettingsValue[K]
  if (row) {
    try {
      value = { ...defaults, ...JSON.parse(row.value) }
    } catch (err) {
      logger.error({ module: 'settings', key, err }, 'configuración ilegible: se usan los valores por defecto')
    }
  }
  cache.set(key, { value, at: Date.now() })
  return value
}

export async function saveSettings<K extends SettingsKey>(key: K, value: SettingsValue[K], userId: number) {
  const json = JSON.stringify(value)
  const now = new Date().toISOString()
  await db
    .insert(settings)
    .values({ key, value: json, updatedById: userId, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedById: userId, updatedAt: now } })
  cache.set(key, { value, at: Date.now() })
  logger.info({ module: 'settings', key, userId }, 'configuración actualizada')
}

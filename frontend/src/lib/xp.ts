/**
 * XP local de respaldo. El valor canónico vive en profiles.xp cuando Directus
 * está disponible; estas funciones permiten que una sesión offline no pierda
 * la recompensa y que se sincronice al volver a tener conexión.
 */
const KEY_PREFIX = 'memora.xp.v1';
const LEGACY_PREFIX = 'memora.discovery.xp.v1';

function keys(userId?: string | number) {
  const suffix = userId ?? 'anonymous';
  return [`${KEY_PREFIX}.${suffix}`, `${LEGACY_PREFIX}.${suffix}`];
}

export function readLocalXp(userId?: string | number) {
  try {
    return Math.max(0, ...keys(userId).map((key) => {
      const value = Number(localStorage.getItem(key) || 0);
      return Number.isFinite(value) ? value : 0;
    }));
  } catch {
    return 0;
  }
}

export function writeLocalXp(value: number, userId?: string | number) {
  try {
    for (const key of keys(userId)) localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch { /* el modo offline sigue funcionando aunque el almacenamiento falle */ }
}

/** Deterministic decor per grid cell (stable across re-renders). */

/** Oversized rest-house marker (matches rock/tree treatment on the map). */
export const HOUSE_MAP_ICON = '🏠'

/** Evacuation helipad — helicopter marker */
export const HELIPAD_ICON = '🚁'

const ROCK_CHARS = ['🪨', '◆', '●']
const TREE_CHARS = ['🌲', '🌳', '▲']

/**
 * @param {number} wx
 * @param {number} wy
 * @returns {{ kind: 'rock' | 'tree'; char: string; iconClass: string; cellClass: string }}
 */
export function wallDecor(wx, wy) {
  const h = (Math.imul(wx, 48271) ^ Math.imul(wy, 92837111)) >>> 0
  /** ~⅔ trees, ⅓ rocks (2× tree density vs even split) */
  if (h % 3 === 0) {
    return {
      kind: 'rock',
      char: ROCK_CHARS[h % ROCK_CHARS.length],
      iconClass: 'text-stone-400/95',
      cellClass: 'bg-[#141210]',
    }
  }
  return {
    kind: 'tree',
    char: TREE_CHARS[(h >>> 3) % TREE_CHARS.length],
    iconClass: 'text-emerald-700/90',
    cellClass: 'bg-[#0d1411]',
  }
}

/**
 * @param {{ kind: string; pickupType?: string }} e
 * @returns {{ label: string; short: string } | null }
 */
export function pickupGoodLabel(e) {
  if (e.kind !== 'pickup') return null
  if (e.pickupType === 'health')
    return { label: 'Med kit', short: 'MED' }
  if (e.pickupType === 'weapon')
    return { label: 'Sidearm', short: 'AMMO' }
  return null
}

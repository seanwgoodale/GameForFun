import { cellKey } from './helpers.js'

/**
 * Chebyshev (square) vision — adds tiles within `radius` steps of the player.
 * @param {Set<string>} revealed
 * @param {number} px
 * @param {number} py
 * @param {number} radius
 * @param {number} cols
 * @param {number} rows
 */
export function expandVision(revealed, px, py, radius, cols, rows) {
  const next = new Set(revealed)
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) > radius) continue
      const x = px + dx
      const y = py + dy
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue
      next.add(cellKey(x, y))
    }
  }
  return next
}

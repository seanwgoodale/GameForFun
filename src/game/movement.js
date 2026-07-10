import { cellKey } from '../utils/helpers.js'
import { clamp } from '../utils/helpers.js'

/**
 * Circle vs axis-aligned rectangle (tile occupies [rx, rx+rw] × [ry, ry+rh]).
 */
export function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const qx = clamp(cx, rx, rx + rw)
  const qy = clamp(cy, ry, ry + rh)
  const dx = cx - qx
  const dy = cy - qy
  return dx * dx + dy * dy < r * r
}

/**
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 */
export function circleHitsWall(wallSet, cols, rows, cx, cy, r) {
  const minIx = Math.max(0, Math.floor(cx - r) - 1)
  const maxIx = Math.min(cols - 1, Math.ceil(cx + r) + 1)
  const minIy = Math.max(0, Math.floor(cy - r) - 1)
  const maxIy = Math.min(rows - 1, Math.ceil(cy + r) + 1)

  for (let iy = minIy; iy <= maxIy; iy++) {
    for (let ix = minIx; ix <= maxIx; ix++) {
      if (!wallSet.has(cellKey(ix, iy))) continue
      if (circleRectOverlap(cx, cy, r, ix, iy, 1, 1)) return true
    }
  }
  return false
}

/**
 * Axis-separated smooth slide against wall tiles (tile space: integer grid).
 * @param {number} px
 * @param {number} py
 * @param {number} dt
 * @param {number} ix intent -1..1
 * @param {number} iy intent -1..1
 * @param {number} speed tiles per second
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {number} radius collision radius in tile units
 */
export function stepSmoothPlayer(
  px,
  py,
  dt,
  ix,
  iy,
  speed,
  wallSet,
  cols,
  rows,
  radius,
) {
  const len = Math.hypot(ix, iy)
  if (len < 1e-6) return { x: px, y: py }

  const mx = (ix / len) * speed * dt
  const my = (iy / len) * speed * dt

  const minC = 1 + radius + 0.02
  const maxX = cols - 1 - radius - 0.02
  const maxY = rows - 1 - radius - 0.02

  let x = px
  let y = py

  let tx = clamp(px + mx, minC, maxX)
  if (!circleHitsWall(wallSet, cols, rows, tx, py, radius)) x = tx

  let ty = clamp(y + my, minC, maxY)
  if (!circleHitsWall(wallSet, cols, rows, x, ty, radius)) y = ty

  return { x, y }
}

/**
 * Squared distance from player center to tile cell center (ex, ey are tile indices).
 */
export function distSqToTileCenter(px, py, ex, ey) {
  const cx = ex + 0.5
  const cy = ey + 0.5
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy
}

/** Squared distance between two points. */
export function distSq(ax, ay, bx, by) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

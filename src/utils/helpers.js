/**
 * @param {number} x
 * @param {number} y
 */
export function cellKey(x, y) {
  return `${x},${y}`
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Radiation pulse radius at time now (entity has pulseGrowMs, pulseShrinkMs, pulseRestMs, pulseOffsetMs).
 * @param {{ pulseGrowMs?: number; pulseShrinkMs?: number; pulseRestMs?: number; pulseOffsetMs?: number }} e
 * @param {number} now Date.now()
 * @param {number} minRadius
 * @param {number} maxRadius
 * @returns {number}
 */
export function getRadiationPulseRadius(e, now, minRadius, maxRadius) {
  const grow = e.pulseGrowMs ?? 4500
  const shrink = e.pulseShrinkMs ?? 4500
  const rest = e.pulseRestMs ?? 5500
  const offset = e.pulseOffsetMs ?? 0
  const cycle = grow + shrink + rest
  const elapsed = (now + offset) % cycle
  if (elapsed < grow) {
    return minRadius + (maxRadius - minRadius) * (elapsed / grow)
  }
  if (elapsed < grow + shrink) {
    const shrinkElapsed = elapsed - grow
    return maxRadius - (maxRadius - minRadius) * (shrinkElapsed / shrink)
  }
  return minRadius
}

/**
 * @param {number} totalSeconds
 * @returns {string} mm:ss
 */
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

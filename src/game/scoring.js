/**
 * @param {number} current
 * @param {number} delta
 */
export function applyScoreDelta(current, delta) {
  return Math.max(0, current + delta)
}

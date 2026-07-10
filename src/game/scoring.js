import { POINTS_PER_CORRECT } from '../utils/constants.js'

/**
 * @param {boolean} isCorrect
 */
export function pointsForAnswer(isCorrect) {
  return isCorrect ? POINTS_PER_CORRECT : 0
}

/**
 * @param {number} current
 * @param {number} delta
 */
export function applyScoreDelta(current, delta) {
  return Math.max(0, current + delta)
}

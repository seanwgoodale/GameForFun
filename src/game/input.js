/**
 * Aggregate WASD / arrows / pad into -1..1 intent per axis.
 * Keyboard is discrete; optional `analog` is normalized -1..1 (e.g. touch stick).
 * @param {Set<string>} keys
 * @param {{ x: number; y: number } | null} [analog]
 */
export function readMoveIntent(keys, analog = null) {
  let x = 0
  let y = 0
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || keys.has('PadLeft'))
    x -= 1
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D') || keys.has('PadRight'))
    x += 1
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W') || keys.has('PadUp'))
    y -= 1
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S') || keys.has('PadDown'))
    y += 1

  if (x !== 0 || y !== 0) return { x, y }

  if (analog) {
    const ax = analog.x
    const ay = analog.y
    if (Math.abs(ax) < 1e-4 && Math.abs(ay) < 1e-4) return { x: 0, y: 0 }
    return { x: ax, y: ay }
  }
  return { x: 0, y: 0 }
}

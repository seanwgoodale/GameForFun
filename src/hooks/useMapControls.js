import { useEffect } from 'react'

const KEY_IDS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'W',
  'a',
  'A',
  's',
  'S',
  'd',
  'D',
  'PadUp',
  'PadDown',
  'PadLeft',
  'PadRight',
])

/**
 * Tracks held keys for smooth movement (keydown / keyup). Uses a Set of key ids.
 * @param {boolean} enabled
 * @param {React.MutableRefObject<Set<string>>} keysRef
 * @param {React.MutableRefObject<{ x: number; y: number }> | null} [analogRef] cleared when disabled (minimap, etc.)
 */
export function useMapControls(enabled, keysRef, analogRef = null) {
  useEffect(() => {
    if (!enabled) {
      keysRef.current.clear()
      if (analogRef) {
        analogRef.current.x = 0
        analogRef.current.y = 0
      }
      return
    }

    function onDown(e) {
      if (!KEY_IDS.has(e.key)) return
      e.preventDefault()
      keysRef.current.add(e.key)
    }

    function onUp(e) {
      if (!KEY_IDS.has(e.key)) return
      e.preventDefault()
      keysRef.current.delete(e.key)
    }

    function onBlur() {
      keysRef.current.clear()
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [enabled, keysRef, analogRef])
}

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

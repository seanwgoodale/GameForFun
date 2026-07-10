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


import { useCallback, useEffect, useState } from 'react'

/**
 * Syncs state with localStorage. Falls back to default when unavailable.
 * @template T
 * @param {string} key
 * @param {T} defaultValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 */
export function useLocalStorage(key, defaultValue) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return defaultValue
      return JSON.parse(raw)
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  const [state, setState] = useState(read)

  useEffect(() => {
    setState(read())
  }, [read])

  const setStored = useCallback(
    (value) => {
      setState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* ignore quota / private mode */
        }
        return next
      })
    },
    [key],
  )

  return [state, setStored]
}

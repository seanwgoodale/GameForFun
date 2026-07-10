import { useCallback, useEffect, useReducer, useRef } from 'react'

/**
 * @param {{ remaining: number; active: boolean }} state
 * @param {{ type: 'tick' | 'reset' | 'pause' | 'resume'; duration?: number }} action
 */
function timerReducer(state, action) {
  switch (action.type) {
    case 'tick': {
      if (!state.active || state.remaining <= 0) return state
      if (state.remaining <= 1) return { remaining: 0, active: false }
      return { remaining: state.remaining - 1, active: state.active }
    }
    case 'reset':
      return { remaining: action.duration ?? 0, active: true }
    case 'pause':
      return { ...state, active: false }
    case 'resume':
      return { ...state, active: true }
    default:
      return state
  }
}

/**
 * Countdown timer. Calls onComplete once when reaching zero.
 * @param {{ durationSec: number; autoStart?: boolean; onComplete?: () => void }} options
 */
export function useTimer({ durationSec, autoStart = true, onComplete }) {
  const [state, dispatch] = useReducer(timerReducer, {
    remaining: durationSec,
    active: autoStart,
  })

  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!state.active || state.remaining <= 0) return
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(id)
  }, [state.active, state.remaining])

  useEffect(() => {
    if (state.remaining !== 0 || state.active) return
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current?.()
  }, [state.remaining, state.active])

  const reset = useCallback(
    (nextDuration = durationSec) => {
      completedRef.current = false
      dispatch({ type: 'reset', duration: nextDuration })
    },
    [durationSec],
  )

  const pause = useCallback(() => dispatch({ type: 'pause' }), [])
  const resume = useCallback(() => dispatch({ type: 'resume' }), [])

  return {
    remaining: state.remaining,
    active: state.active,
    reset,
    pause,
    resume,
    isDone: state.remaining === 0 && !state.active,
  }
}

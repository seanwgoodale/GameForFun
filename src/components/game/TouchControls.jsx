import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Thumb-zone touch controls: joystick bottom-left, FIRE / MED bottom-right.
 * Each control captures its own pointer, so moving and shooting work
 * simultaneously (multi-touch). Rendered only for coarse pointers.
 *
 * @param {{
 *   disabled: boolean
 *   analogRef: { current: { x: number; y: number } }
 *   onFire: () => void
 *   onMed: () => void
 *   medCount: number
 *   ammoCount: number
 * }} props
 */
export function TouchControls({
  disabled,
  analogRef,
  onFire,
  onMed,
  medCount,
  ammoCount,
}) {
  const baseRef = useRef(null)
  const activeRef = useRef(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const release = useCallback(() => {
    activeRef.current = false
    analogRef.current.x = 0
    analogRef.current.y = 0
    setKnob({ x: 0, y: 0 })
  }, [analogRef])

  if (disabled && (knob.x !== 0 || knob.y !== 0)) {
    setKnob({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (disabled) {
      activeRef.current = false
      analogRef.current.x = 0
      analogRef.current.y = 0
    }
  }, [disabled, analogRef])

  const updateFromClient = useCallback(
    (clientX, clientY) => {
      const el = baseRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const maxR = r.width * 0.38
      const dead = maxR * 0.12
      const dist = Math.hypot(dx, dy)
      if (dist < dead) {
        analogRef.current.x = 0
        analogRef.current.y = 0
        setKnob({ x: 0, y: 0 })
        return
      }
      let nx = dx / maxR
      let ny = dy / maxR
      const nlen = Math.hypot(nx, ny)
      if (nlen > 1) {
        nx /= nlen
        ny /= nlen
      }
      analogRef.current.x = nx
      analogRef.current.y = ny
      const pull = Math.min(dist, maxR)
      setKnob({ x: (dx / dist) * pull, y: (dy / dist) * pull })
    },
    [analogRef],
  )

  function onPointerDown(e) {
    if (disabled) return
    e.preventDefault()
    activeRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* unsupported */
    }
    updateFromClient(e.clientX, e.clientY)
  }

  function onPointerMove(e) {
    if (!activeRef.current || disabled) return
    updateFromClient(e.clientX, e.clientY)
  }

  function onPointerEnd() {
    if (!activeRef.current) return
    release()
  }

  return (
    <>
      {/* Joystick — bottom-left thumb zone */}
      <div
        ref={baseRef}
        className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] h-36 w-36 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="presentation"
      >
        <div className="absolute inset-0 rounded-full border-2 border-amber-200/20 bg-black/30 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute inset-[20%] rounded-full border border-amber-200/15" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-amber-300/40 bg-amber-400/25 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          style={{
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>

      {/* Action cluster — bottom-right thumb zone */}
      <div className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] flex items-end gap-3 select-none">
        <button
          type="button"
          disabled={disabled || medCount <= 0}
          onPointerDown={(e) => {
            e.preventDefault()
            onMed()
          }}
          className="flex h-14 w-14 touch-none flex-col items-center justify-center rounded-full border-2 border-emerald-300/30 bg-emerald-900/40 text-[10px] font-bold tracking-wider text-emerald-100 backdrop-blur-[2px] disabled:opacity-35"
        >
          MED
          <span className="font-mono text-[11px]">{medCount}</span>
        </button>
        <button
          type="button"
          disabled={disabled || ammoCount <= 0}
          onPointerDown={(e) => {
            e.preventDefault()
            onFire()
          }}
          className="flex h-20 w-20 touch-none flex-col items-center justify-center rounded-full border-2 border-amber-300/40 bg-amber-800/45 text-xs font-bold tracking-wider text-amber-50 shadow-[0_2px_14px_rgba(0,0,0,0.5)] backdrop-blur-[2px] active:scale-95 disabled:opacity-35"
        >
          FIRE
          <span className="font-mono text-[11px] text-amber-200/90">{ammoCount}</span>
        </button>
      </div>
    </>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Virtual analog stick — drag from center for 360° movement (mobile).
 * Writes normalized -1..1 into `analogRef` for {@link readMoveIntent}.
 *
 * @param {{
 *   disabled: boolean
 *   analogRef: React.MutableRefObject<{ x: number; y: number }>
 * }} props
 */
export function TouchJoystick({ disabled, analogRef }) {
  const baseRef = useRef(null)
  const activeRef = useRef(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const release = useCallback(() => {
    activeRef.current = false
    analogRef.current.x = 0
    analogRef.current.y = 0
    setKnob({ x: 0, y: 0 })
  }, [analogRef])

  useEffect(() => {
    if (disabled) release()
  }, [disabled, release])

  const updateFromClient = useCallback(
    (clientX, clientY) => {
      const el = baseRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const maxR = r.width * 0.36
      const dead = maxR * 0.14
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
      /* */
    }
    updateFromClient(e.clientX, e.clientY)
  }

  function onPointerMove(e) {
    if (!activeRef.current || disabled) return
    updateFromClient(e.clientX, e.clientY)
  }

  function onPointerEnd(e) {
    if (!activeRef.current) return
    release()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:hidden">
      <span className="sr-only">Move: touch the pad and drag in any direction</span>
      <div
        ref={baseRef}
        className="relative h-36 w-36 touch-none select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="presentation"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full border-2 border-amber-800/55 bg-[#14110d]/95 shadow-[inset_0_0_28px_rgba(0,0,0,0.55)]" />
        <div className="pointer-events-none absolute inset-[18%] rounded-full border border-amber-700/25" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[2.75rem] w-[2.75rem] rounded-full border border-amber-600/50 bg-gradient-to-br from-amber-500/25 to-amber-900/40 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
          style={{
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>
      <p className="text-center text-[10px] text-amber-200/40">
        Drag to move · release to stop
      </p>
    </div>
  )
}

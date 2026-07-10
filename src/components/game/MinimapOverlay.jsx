import { useEffect, useRef } from 'react'
import { cellKey } from '../../utils/helpers.js'

const SCALE = 3

/**
 * Canvas minimap: explored terrain, trails, the helipad (once found), and a
 * pulsing player dot. Tap anywhere or Esc/M to close.
 * @param {{ open: boolean; onClose: () => void; game: object }} props
 */
export function MinimapOverlay({ open, onClose, game }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    const draw = () => {
      const { MAP_COLS: cols, MAP_ROWS: rows, wallSet, pathSet, revealed, player, exitCell, spawnCell } = game
      canvas.width = cols * SCALE
      canvas.height = rows * SCALE
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#0b0906'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const key = cellKey(x, y)
          if (!revealed.has(key)) continue
          if (wallSet.has(key)) ctx.fillStyle = '#3d4a35'
          else if (pathSet.has(key)) ctx.fillStyle = '#5d5140'
          else ctx.fillStyle = '#20301c'
          ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
        }
      }
      if (revealed.has(cellKey(exitCell.x, exitCell.y))) {
        ctx.fillStyle = '#ffd166'
        ctx.fillRect(exitCell.x * SCALE - 2, exitCell.y * SCALE - 2, SCALE + 4, SCALE + 4)
      }
      ctx.fillStyle = '#8a8a94'
      ctx.fillRect(spawnCell.x * SCALE, spawnCell.y * SCALE, SCALE, SCALE)
      // Player dot pulses so it's findable at a glance.
      const pulse = 2 + Math.sin(performance.now() / 200) * 1.2
      ctx.fillStyle = '#ffdf8a'
      ctx.beginPath()
      ctx.arc(player.x * SCALE, player.y * SCALE, SCALE + pulse, 0, Math.PI * 2)
      ctx.fill()
    }
    draw()
    const id = setInterval(draw, 120)
    return () => clearInterval(id)
  }, [open, game])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      onPointerDown={onClose}
      role="dialog"
      aria-label="Minimap"
    >
      <div className="max-h-full max-w-full overflow-auto rounded-lg border-2 border-amber-200/25 bg-[#0b0906] p-2 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="h-auto max-h-[75dvh] w-auto max-w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-amber-200/50">
          Gold pulse = you · Gold square = extraction · Tap to close
        </p>
      </div>
    </div>
  )
}

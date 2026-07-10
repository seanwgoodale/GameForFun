import { useEffect, useRef } from 'react'
import { store } from '../../game/gameStore.js'
import { GameRenderer } from '../../render/renderer.js'

/** Mounts the canvas and hands it to the game renderer. No game logic here. */
export function CanvasMap() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const renderer = new GameRenderer(canvasRef.current, store)
    renderer.start()
    return () => renderer.destroy()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label="Wasteland map"
    />
  )
}

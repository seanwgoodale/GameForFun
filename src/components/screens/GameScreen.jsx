import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../../game/audio.js'
import { useMapControls } from '../../hooks/useMapControls.js'
import { useTimer } from '../../hooks/useTimer.js'
import { MAX_HEALTH, ROUND_DURATION_SEC } from '../../utils/constants.js'
import { formatTime } from '../../utils/helpers.js'
import { CanvasMap } from '../game/CanvasMap.jsx'
import { EncounterPanel } from '../game/EncounterPanel.jsx'
import { MinimapOverlay } from '../game/MinimapOverlay.jsx'
import { TouchControls } from '../game/TouchControls.jsx'

const isCoarsePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches

/** @param {{ onTimeUp: (finalScore: number) => void; game: object }} props */
export function GameScreen({ onTimeUp, game }) {
  const scoreRef = useRef(game.score)
  const onTimeUpRef = useRef(onTimeUp)
  const gameStopRef = useRef(game.stopGame)
  const clearPendingRef = useRef(game.clearPendingEnd)
  const endedRef = useRef(false)
  const [touchUI] = useState(isCoarsePointer)

  useEffect(() => {
    scoreRef.current = game.score
  }, [game.score])
  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  }, [onTimeUp])
  useEffect(() => {
    gameStopRef.current = game.stopGame
  }, [game.stopGame])
  useEffect(() => {
    clearPendingRef.current = game.clearPendingEnd
  }, [game.clearPendingEnd])

  const notifyEnd = useCallback((finalScore) => {
    if (endedRef.current) return
    endedRef.current = true
    gameStopRef.current()
    clearPendingRef.current()
    onTimeUpRef.current(finalScore)
  }, [])

  const { remaining } = useTimer({
    durationSec: ROUND_DURATION_SEC,
    autoStart: true,
    onComplete: () => notifyEnd(scoreRef.current),
  })

  useEffect(() => {
    if (game.pendingEndScore == null) return
    notifyEnd(game.pendingEndScore)
  }, [game.pendingEndScore, notifyEnd])

  const movementEnabled = Boolean(game.playing && !game.encounterId)
  const [minimapOpen, setMinimapOpen] = useState(false)
  const [muted, setMuted] = useState(() => audio.isMuted())
  useEffect(() => audio.onMuteChange(setMuted), [])
  const mapInputEnabled = movementEnabled && !minimapOpen

  useMapControls(mapInputEnabled, game.moveKeysRef, game.touchAnalogRef)

  useEffect(() => {
    if (game.encounterId) setMinimapOpen(false)
  }, [game.encounterId])

  const {
    playing,
    encounterId,
    fireRangedWeapon,
    useHealthPack: consumeHealthPack,
  } = game
  useEffect(() => {
    if (!playing) {
      setMinimapOpen(false)
      return
    }
    function onKey(e) {
      if (e.repeat) return
      if (e.key === 'Escape') {
        setMinimapOpen(false)
        return
      }
      if (encounterId) return
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        fireRangedWeapon()
        return
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        consumeHealthPack()
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setMinimapOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, encounterId, fireRangedWeapon, consumeHealthPack])

  const healthFrac = Math.max(0, Math.min(1, game.health / MAX_HEALTH))
  const lowTime = remaining <= 60
  const quotaMet = game.zombiesKilled >= game.zombiesToEliminate

  const hudChip =
    'pointer-events-auto rounded-md border border-amber-100/15 bg-black/45 px-2.5 py-1.5 backdrop-blur-[3px]'

  const statLine = useMemo(
    () => [
      { label: 'AMMO', value: game.weapons, tone: 'text-amber-200' },
      { label: 'MED', value: game.healthPacks, tone: 'text-emerald-300' },
      {
        label: 'KILLS',
        value: `${game.zombiesKilled}/${game.zombiesToEliminate}`,
        tone: quotaMet ? 'text-emerald-300' : 'text-amber-100',
      },
    ],
    [game.weapons, game.healthPacks, game.zombiesKilled, game.zombiesToEliminate, quotaMet],
  )

  return (
    <div className="relative h-dvh w-full select-none overflow-hidden bg-[#0c0a08] text-amber-50">
      <CanvasMap />

      {/* ── Top HUD ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Vitals + supplies */}
        <div className="flex max-w-[46%] flex-col gap-1.5">
          <div className={hudChip}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold tracking-[0.18em] text-amber-200/60">
                VITALS
              </span>
              <span className="font-mono text-[11px] text-amber-100/90">
                {Math.round(game.health)}
              </span>
            </div>
            <div className="mt-1 h-2 w-36 max-w-full overflow-hidden rounded-sm bg-black/60">
              <div
                className={`h-full transition-[width] duration-200 ${
                  healthFrac < 0.3
                    ? 'bg-red-500'
                    : healthFrac < 0.6
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${healthFrac * 100}%` }}
              />
            </div>
          </div>
          <div className={`${hudChip} flex items-center gap-3`}>
            {statLine.map((s) => (
              <span key={s.label} className="flex items-baseline gap-1">
                <span className="text-[9px] font-bold tracking-[0.14em] text-amber-200/50">
                  {s.label}
                </span>
                <span className={`font-mono text-xs font-semibold ${s.tone}`}>
                  {s.value}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Timer + score + buttons */}
        <div className="flex flex-col items-end gap-1.5">
          <div className={`${hudChip} text-right`}>
            <div
              className={`font-mono text-lg font-bold leading-none tracking-wide ${
                lowTime ? 'animate-pulse text-red-400' : 'text-amber-100'
              }`}
            >
              {formatTime(remaining)}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-amber-200/70">
              SCORE <span className="font-mono text-amber-100">{game.score}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => audio.toggleMuted()}
              className={`${hudChip} text-[10px] font-bold tracking-[0.14em] ${
                muted ? 'text-amber-200/35' : 'text-amber-200/80'
              } active:bg-black/70`}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            >
              {muted ? 'SND OFF' : 'SND ON'}
            </button>
            <button
              type="button"
              onClick={() => setMinimapOpen((o) => !o)}
              className={`${hudChip} text-[10px] font-bold tracking-[0.14em] text-amber-200/80 active:bg-black/70`}
            >
              MAP
            </button>
          </div>
        </div>
      </div>

      {/* ── Objective banner ────────────────────────────────────── */}
      {game.exitBlocked ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center px-4">
          <p className="rounded-md border border-red-400/30 bg-red-950/70 px-3 py-1.5 text-center text-xs font-semibold tracking-wide text-red-100 backdrop-blur-[3px]">
            Extraction locked — eliminate{' '}
            {game.zombiesToEliminate - game.zombiesKilled} more hostiles
          </p>
        </div>
      ) : null}
      {quotaMet && !game.exitBlocked && playing ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center px-4">
          <p className="rounded-md border border-emerald-400/25 bg-emerald-950/60 px-3 py-1.5 text-center text-xs font-semibold tracking-wide text-emerald-100 backdrop-blur-[3px]">
            Quota cleared — reach the helipad
          </p>
        </div>
      ) : null}

      {/* Desktop key hints */}
      {!touchUI ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center sm:flex">
          <p className="rounded-md bg-black/40 px-3 py-1 text-[10px] tracking-wider text-amber-200/45 backdrop-blur-[2px]">
            WASD move · SPACE fire · H medkit · M map
          </p>
        </div>
      ) : null}

      {touchUI ? (
        <TouchControls
          disabled={!mapInputEnabled}
          analogRef={game.touchAnalogRef}
          onFire={game.fireRangedWeapon}
          onMed={game.useHealthPack}
          medCount={game.healthPacks}
          ammoCount={game.weapons}
        />
      ) : null}

      <MinimapOverlay
        open={minimapOpen}
        onClose={() => setMinimapOpen(false)}
        game={game}
      />

      <EncounterPanel
        open={Boolean(game.encounterId && game.encounter)}
        encounter={game.encounter}
        step={game.encounterStep ?? 'choice'}
        result={game.encounterResult}
        health={game.health}
        ammo={game.weapons}
        medkits={game.healthPacks}
        onChoose={(i) => game.resolveEncounterChoice(i)}
        onContinue={game.dismissEncounterResult}
      />
    </div>
  )
}

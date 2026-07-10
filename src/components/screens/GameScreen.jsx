import { useCallback, useEffect, useRef, useState } from 'react'
import { EncounterModal } from '../game/EncounterModal.jsx'
import { GameMap } from '../game/GameMap.jsx'
import { Minimap } from '../game/Minimap.jsx'
import { ProgressBar } from '../game/ProgressBar.jsx'
import { ScoreDisplay } from '../game/ScoreDisplay.jsx'
import { Timer } from '../game/Timer.jsx'
import { useMapControls } from '../../hooks/useMapControls.js'
import { useTimer } from '../../hooks/useTimer.js'
import {
  MAX_HEALTH,
  ROUND_DURATION_SEC,
  WEAPON_KILL_CHANCE_PERCENT,
} from '../../utils/constants.js'

/** @param {{ onTimeUp: (finalScore: number) => void; game: object }} props */
export function GameScreen({ onTimeUp, game }) {
  const scoreRef = useRef(game.score)
  const onTimeUpRef = useRef(onTimeUp)
  const gameStopRef = useRef(game.stopGame)
  const clearPendingRef = useRef(game.clearPendingEnd)
  const endedRef = useRef(false)

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
    onComplete: () => {
      notifyEnd(scoreRef.current)
    },
  })

  useEffect(() => {
    if (game.pendingEndScore == null) return
    notifyEnd(game.pendingEndScore)
  }, [game.pendingEndScore, notifyEnd])

  const movementEnabled = Boolean(game.playing && !game.encounterId)
  const [minimapOpen, setMinimapOpen] = useState(false)
  /** Keyboard + thumb stick (disabled while minimap is open). */
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

  const encounterBadge =
    game.encounterEntity?.kind === 'trader'
      ? 'Trade'
      : game.encounterEntity?.kind === 'zombie'
        ? 'Hostile'
        : 'Encounter'

  const hostileEncounter =
    game.encounterEntity?.kind === 'zombie' ||
    game.encounterEntity?.kind === 'trader'

  return (
    <div className="min-h-dvh bg-[#0a0908] px-4 py-6 text-amber-100/95">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4">
          <GameMap
            worldCols={game.MAP_COLS}
            worldRows={game.MAP_ROWS}
            viewCols={game.VIEWPORT_COLS}
            viewRows={game.VIEWPORT_ROWS}
            wallSet={game.wallSet}
            pathSet={game.pathSet}
            revealed={game.revealed}
            player={game.player}
            entities={game.entities}
            exitCell={game.exitCell}
            spawnCell={game.spawnCell}
            health={game.health}
            ammo={game.weapons}
            healthPacks={game.healthPacks}
            projectile={game.projectile}
            hostileProjectile={game.hostileProjectile}
            movementEnabled={mapInputEnabled}
            touchAnalogRef={game.touchAnalogRef}
          />
        </div>

        <div className="w-full shrink-0 space-y-4 lg:max-w-xs">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Timer
              remainingSec={remaining}
              label="Time left"
              variant="vault"
            />
            <div className="rounded-xl border border-amber-900/50 bg-[#14110d] px-4 py-3">
              <ScoreDisplay
                score={game.score}
                label="Score"
                variant="vault"
              />
            </div>
          </div>
          <div className="rounded-xl border border-amber-900/50 bg-[#14110d] px-4 py-3">
            <ProgressBar
              label="Vitals"
              value={game.health}
              max={MAX_HEALTH}
            />
            <p className="text-xs text-amber-200/50">
              Sidearm charges:{' '}
              <span className="font-mono text-amber-100">{game.weapons}</span>
            </p>
          </div>
          <p className="text-xs text-amber-200/50">
            Zombies eliminated:{' '}
            <span className="font-mono text-amber-100">
              {game.zombiesKilled ?? 0}/{game.zombiesToEliminate ?? 10}
            </span>{' '}
            (need {game.zombiesToEliminate ?? 10} to extract)
          </p>
          <p className="text-xs text-amber-200/50">
            Encounters cleared:{' '}
            <span className="font-mono text-amber-100">
              {game.encountersCleared}/{game.encounterTotal}
            </span>
          </p>
          {game.exitBlocked ? (
            <p className="rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90">
              Eliminate {game.zombiesToEliminate ?? 10} zombies to extract.
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-amber-200/45">
            Outdoor grid — M for minimap (yellow pulse = you). Light dirt trails
            link camps, med drops, and the helipad. <strong>Space</strong> fires
            ranged shot (4-tile range, uses last move direction). 🏠 restores
            vitals. Scavenge + and ⚔. In encounters, Z/T: talk or shoot (
            {WEAPON_KILL_CHANCE_PERCENT}% clear).
          </p>
        </div>
      </div>

      <Minimap
        open={minimapOpen}
        onClose={() => setMinimapOpen(false)}
        worldCols={game.MAP_COLS}
        worldRows={game.MAP_ROWS}
        wallSet={game.wallSet}
        revealed={game.revealed}
        player={game.player}
        exitCell={game.exitCell}
        spawnCell={game.spawnCell}
        entities={game.entities}
        pathSet={game.pathSet}
      />

      <EncounterModal
        open={Boolean(game.encounterId && game.encounterScenario)}
        badgeLabel={encounterBadge}
        title={game.encounterScenario?.title ?? ''}
        prompt={game.encounterScenario?.prompt ?? ''}
        options={game.encounterScenario?.options ?? []}
        onSelect={(i) => game.submitEncounterAnswer(i)}
        weapons={game.weapons}
        weaponKillChancePercent={WEAPON_KILL_CHANCE_PERCENT}
        onTryWeapon={game.tryWeaponOnEncounter}
        weaponFeedback={game.weaponFeedback}
        showPlayerVitals={Boolean(hostileEncounter)}
        playerHealth={game.health}
        playerHealthMax={MAX_HEALTH}
        encounterStep={game.encounterStep ?? 'question'}
        isTrader={game.encounterEntity?.kind === 'trader'}
        onPickReward={game.pickTraderReward}
      />
    </div>
  )
}

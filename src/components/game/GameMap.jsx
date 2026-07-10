import { useEffect, useMemo, useState } from 'react'
import { RADIATION_PULSE_MAX, RADIATION_PULSE_MIN, STARTING_HEALTH } from '../../utils/constants.js'
import { cellKey, getRadiationPulseRadius } from '../../utils/helpers.js'
import {
  HELIPAD_ICON,
  HOUSE_MAP_ICON,
  pickupGoodLabel,
  wallDecor,
} from '../../utils/mapDecor.js'
import { TouchJoystick } from './TouchJoystick.jsx'

/**
 * @param {{
 *   worldCols: number
 *   worldRows: number
 *   viewCols: number
 *   viewRows: number
 *   wallSet: Set<string>
 *   pathSet?: Set<string>
 *   revealed: Set<string>
 *   player: { x: number; y: number }
 *   entities: { id: string; kind: string; x: number; y: number; defeated?: boolean }[]
 *   exitCell: { x: number; y: number }
 *   spawnCell: { x: number; y: number }
 *   health: number
 *   ammo?: number
 *   healthPacks?: number
 *   projectile?: { dx: number; dy: number } | null
 *   hostileProjectile?: { ex: number; ey: number } | null
 *   movementEnabled: boolean
 *   touchAnalogRef: React.MutableRefObject<{ x: number; y: number }>
 * }} props
 */
export function GameMap({
  worldCols,
  worldRows,
  viewCols,
  viewRows,
  wallSet,
  pathSet = new Set(),
  revealed,
  player,
  entities,
  exitCell,
  spawnCell,
  health,
  ammo = 0,
  healthPacks = 0,
  projectile = null,
  hostileProjectile = null,
  movementEnabled,
  touchAnalogRef,
}) {
  const [pulseTick, setPulseTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPulseTick((t) => t + 1), 300)
    return () => clearInterval(id)
  }, [])

  const halfW = viewCols / 2
  const halfH = viewRows / 2
  let camX = player.x - halfW
  let camY = player.y - halfH
  camX = Math.max(0, Math.min(camX, worldCols - viewCols))
  camY = Math.max(0, Math.min(camY, worldRows - viewRows))

  const camXi = Math.floor(camX)
  const camYi = Math.floor(camY)
  const subX = camX - camXi
  const subY = camY - camYi

  function entityAt(wx, wy) {
    return entities.find((e) => {
      if (e.defeated) return false
      const ex = Number.isInteger(e.x) ? e.x : Math.floor(e.x)
      const ey = Number.isInteger(e.y) ? e.y : Math.floor(e.y)
      return ex === wx && ey === wy
    })
  }

  function isHostileMapGlyph(e) {
    return (
      e.kind === 'zombie' ||
      e.kind === 'trader' ||
      e.kind === 'radiation'
    )
  }

  function glyphForEntity(e) {
    if (e.kind === 'zombie') return { char: 'Z', tone: 'text-rose-400' }
    if (e.kind === 'trader') {
      const angry = e.angryUntil && Date.now() < e.angryUntil
      return {
        char: 'T',
        tone: e.traded || angry ? 'text-emerald-400' : 'text-amber-300',
      }
    }
    if (e.kind === 'radiation') return { char: '☢', tone: 'text-lime-400' }
    if (e.kind === 'pickup' && e.pickupType === 'health')
      return { char: '+', tone: 'text-emerald-400' }
    if (e.kind === 'pickup' && e.pickupType === 'weapon')
      return { char: '⚔', tone: 'text-sky-300' }
    if (e.kind === 'house')
      return { char: HOUSE_MAP_ICON, tone: 'text-amber-200/95' }
    return { char: '?', tone: 'text-slate-400' }
  }

  const padRight =
    subX > 0.001 && camXi + viewCols < worldCols ? 1 : 0
  const padBottom =
    subY > 0.001 && camYi + viewRows < worldRows ? 1 : 0
  const cellsW = viewCols + padRight
  const cellsH = viewRows + padBottom

  const cells = []
  for (let vy = 0; vy < cellsH; vy++) {
    for (let vx = 0; vx < cellsW; vx++) {
      cells.push({ vx, vy, wx: camXi + vx, wy: camYi + vy })
    }
  }

  const pl = ((player.x - camX) / viewCols) * 100
  const pt = ((player.y - camY) / viewRows) * 100

  const gridTranslateX = -subX * (100 / cellsW)
  const gridTranslateY = -subY * (100 / cellsH)

  const radEntities = useMemo(
    () =>
      entities.filter(
        (e) =>
          !e.defeated &&
          e.kind === 'radiation' &&
          revealed.has(cellKey(Math.floor(e.x), Math.floor(e.y))),
      ),
    [entities, revealed],
  )

  const radiationClusterCenters = useMemo(() => {
    if (radEntities.length === 0) return []
    const posKey = (e) => cellKey(Math.floor(e.x), Math.floor(e.y))
    const neighbors = (key) => {
      const [x, y] = key.split(',').map(Number)
      return [
        cellKey(x - 1, y),
        cellKey(x + 1, y),
        cellKey(x, y - 1),
        cellKey(x, y + 1),
      ]
    }
    const keyToEntity = new Map(radEntities.map((e) => [posKey(e), e]))
    const visited = new Set()
    const centers = []
    for (const e of radEntities) {
      const k = posKey(e)
      if (visited.has(k)) continue
      const cluster = new Set([k])
      const q = [k]
      visited.add(k)
      while (q.length > 0) {
        const cur = q.shift()
        for (const nk of neighbors(cur)) {
          if (!keyToEntity.has(nk) || visited.has(nk)) continue
          visited.add(nk)
          cluster.add(nk)
          q.push(nk)
        }
      }
      const entitiesInCluster = [...cluster]
        .map((ck) => keyToEntity.get(ck))
        .filter(Boolean)
      const sumX = entitiesInCluster.reduce(
        (s, ent) => s + ((Number.isInteger(ent.x) ? ent.x : Math.floor(ent.x)) + 0.5),
        0,
      )
      const sumY = entitiesInCluster.reduce(
        (s, ent) => s + ((Number.isInteger(ent.y) ? ent.y : Math.floor(ent.y)) + 0.5),
        0,
      )
      centers.push({
        cx: sumX / entitiesInCluster.length,
        cy: sumY / entitiesInCluster.length,
      })
    }
    return centers
  }, [radEntities])

  const radiationInView = useMemo(() => {
    const pad = 3
    const minWx = camXi - pad
    const maxWx = camXi + viewCols + pad
    const minWy = camYi - pad
    const maxWy = camYi + viewRows + pad
    return radEntities.filter((e) => {
      const wx = Math.floor(e.x)
      const wy = Math.floor(e.y)
      return wx >= minWx && wx <= maxWx && wy >= minWy && wy <= maxWy
    })
  }, [radEntities, camXi, camYi, viewCols, viewRows])

  return (
    <div className="vault-map space-y-4">
      <div
        className="crt-grid relative mx-auto w-full max-w-[min(100%,144rem)] overflow-hidden rounded-lg border-2 border-amber-900/60 bg-[#1c1914] shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]"
        style={{
          aspectRatio: `${viewCols} / ${viewRows}`,
          maxHeight: 'min(100dvh, 1200px)',
        }}
      >
        <div
          className="vault-grid pointer-events-none absolute inset-0 grid h-full w-full overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cellsW}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${cellsH}, minmax(0, 1fr))`,
            width: `${(cellsW / viewCols) * 100}%`,
            height: `${(cellsH / viewRows) * 100}%`,
            transform: `translate(${gridTranslateX}%, ${gridTranslateY}%)`,
          }}
        >
          {cells.map(({ vx, vy, wx, wy }) => {
            const key = cellKey(wx, wy)
            const inFog = !revealed.has(key)
            const wall = wallSet.has(key)
            const exit = wx === exitCell.x && wy === exitCell.y
            const vaultExitTile =
              wx === spawnCell.x && wy === spawnCell.y && !wall && !exit
            const ent = entityAt(wx, wy)
            const g = ent ? glyphForEntity(ent) : null
            const wallDeco = wall ? wallDecor(wx, wy) : null
            const goodLabel = ent && !wall ? pickupGoodLabel(ent) : null
            const houseRest =
              ent?.kind === 'house' && !wall
                ? { short: 'REST', label: 'Rest — restores vitals' }
                : null
            const onPath =
              !wall &&
              !exit &&
              !vaultExitTile &&
              pathSet.size > 0 &&
              pathSet.has(key)

            if (inFog) {
              return (
                <div
                  key={`${vx}-${vy}`}
                  className="relative flex items-center justify-center border border-black/50 bg-[#050403] font-mono text-[8px] text-amber-950/25 sm:text-[9px]"
                  aria-label="Unexplored"
                >
                  <span className="select-none opacity-40" aria-hidden>
                    ·
                  </span>
                </div>
              )
            }

            return (
              <div
                key={`${vx}-${vy}`}
                className={[
                  'relative flex items-center justify-center border border-amber-950/40 font-mono text-[9px] sm:text-[10px]',
                  wall && wallDeco
                    ? `z-[2] overflow-visible ${wallDeco.cellClass}`
                    : exit
                      ? 'bg-slate-900/90 text-slate-100'
                      : vaultExitTile
                        ? 'bg-zinc-900/92 text-zinc-300'
                        : onPath
                        ? 'bg-[#5c5243]/90 text-amber-200/40'
                        : 'bg-[#0d2818]/92 text-emerald-100/25',
                ].join(' ')}
                aria-label={
                  wall && wallDeco
                    ? wallDeco.kind === 'rock'
                      ? 'Rock barrier'
                      : 'Tree barrier'
                    : exit
                      ? 'Helipad — extraction'
                      : vaultExitTile
                        ? 'Vault exit'
                        : houseRest
                          ? houseRest.label
                          : goodLabel
                            ? goodLabel.label
                            : undefined
                }
              >
                {wall && wallDeco ? (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 scale-[2.45] select-none text-[0.72rem] leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] sm:scale-[2.85] sm:text-[0.88rem] ${wallDeco.iconClass}`}
                  >
                    {wallDeco.char}
                  </span>
                ) : null}
                {exit && !wall ? (
                  <div className="flex flex-col items-center justify-center gap-px leading-none">
                    <span
                      aria-hidden
                      className="select-none text-[0.62rem] leading-none drop-shadow sm:text-[0.72rem]"
                    >
                      {HELIPAD_ICON}
                    </span>
                    <span className="select-none text-[0.42rem] font-bold uppercase tracking-wide text-amber-300/95 sm:text-[0.48rem]">
                      PAD
                    </span>
                  </div>
                ) : null}
                {vaultExitTile ? (
                  <div className="flex flex-col items-center justify-center gap-px leading-none">
                    <span
                      aria-hidden
                      className="select-none text-[0.55rem] opacity-90 sm:text-[0.6rem]"
                    >
                      🚪
                    </span>
                    <span className="select-none text-[0.38rem] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[0.42rem]">
                      Vault
                    </span>
                  </div>
                ) : null}
                {ent && !wall && houseRest ? (
                  <div className="relative z-[4] flex flex-col items-center justify-center overflow-visible">
                    <span
                      aria-hidden
                      className="pointer-events-none -mt-0.5 scale-[2.35] select-none text-[0.75rem] leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] sm:scale-[2.72] sm:text-[0.9rem]"
                    >
                      {HOUSE_MAP_ICON}
                    </span>
                    <span className="relative z-[6] -mt-0.5 text-[0.45rem] font-semibold uppercase tracking-wide text-amber-200/95 sm:text-[0.5rem]">
                      {houseRest.short}
                    </span>
                  </div>
                ) : null}
                {ent && !wall && !houseRest && goodLabel ? (
                  <div className="flex flex-col items-center justify-center gap-px leading-none">
                    <span
                      className={`select-none text-xs font-bold sm:text-sm ${g?.tone}`}
                      aria-hidden
                    >
                      {g?.char}
                    </span>
                    <span
                      className={`select-none text-[0.45rem] font-semibold uppercase tracking-wide opacity-95 sm:text-[0.5rem] ${g?.tone}`}
                    >
                      {goodLabel.short}
                    </span>
                  </div>
                ) : null}
                {ent && !wall && !houseRest && !goodLabel ? (
                  (ent.kind === 'zombie' || ent.kind === 'trader') || ent.kind === 'radiation'
                    ? null
                    : (
                    <span
                      className={`select-none text-xs font-bold sm:text-sm ${g?.tone}`}
                      aria-hidden
                    >
                      {g?.char}
                    </span>
                  )
                ) : null}
              </div>
            )
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10"
          aria-hidden
        >
          <div
            className="absolute flex h-[min(12%,18px)] w-[min(12%,18px)] min-h-[14px] min-w-[14px] items-center justify-center rounded-sm border border-amber-200/85 bg-amber-400/95 text-[0.45rem] font-bold text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.5)] sm:text-[0.5rem]"
            style={{
              left: `${pl}%`,
              top: `${pt}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title="You"
          >
            @
          </div>
          {projectile ? (
            <div
              className="projectile-ball absolute h-[min(6.7%,9px)] w-[min(6.7%,9px)] min-h-[7px] min-w-[7px] rounded-full bg-black shadow-[0_0_4px_rgba(0,0,0,0.8)]"
              style={
                {
                  '--proj-start-x': `${pl}%`,
                  '--proj-start-y': `${pt}%`,
                  '--proj-end-x': `${pl + (4 * projectile.dx * 100) / viewCols}%`,
                  '--proj-end-y': `${pt + (4 * projectile.dy * 100) / viewRows}%`,
                }
              }
            />
          ) : null}
          {(() => {
            const radEntities = radiationInView
            if (radEntities.length === 0) return null
            const now = Date.now()
            const pad = 2
            const centersInView = radiationClusterCenters.filter(
              (c) =>
                c.cx >= camX - pad &&
                c.cx <= camX + viewCols + pad &&
                c.cy >= camY - pad &&
                c.cy <= camY + viewRows + pad,
            )
            const tileW = 100 / viewCols
            const tileH = 100 / viewRows
            return (
              <>
                {radEntities.map((e) => {
                  const cx = (Number.isInteger(e.x) ? e.x : Math.floor(e.x)) + 0.5
                  const cy = (Number.isInteger(e.y) ? e.y : Math.floor(e.y)) + 0.5
                  const radius = getRadiationPulseRadius(
                    e,
                    now,
                    RADIATION_PULSE_MIN,
                    RADIATION_PULSE_MAX,
                  )
                  const diamW = 2 * radius * tileW
                  const diamH = 2 * radius * tileH
                  const left = ((cx - camX) / viewCols) * 100
                  const top = ((cy - camY) / viewRows) * 100
                  return (
                    <div
                      key={e.id}
                      className="absolute rounded-full border-2 border-lime-400/60 bg-lime-500/25"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${diamW}%`,
                        height: `${diamH}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `inset 0 0 20px rgba(163,230,53,0.3), 0 0 15px rgba(163,230,53,0.2)`,
                      }}
                      aria-hidden
                    />
                  )
                })}
                {centersInView.map((c, i) => {
                  const left = ((c.cx - camX) / viewCols) * 100
                  const top = ((c.cy - camY) / viewRows) * 100
                  return (
                    <div
                      key={`rad-icon-${i}`}
                      className="absolute flex min-h-[14px] min-w-[14px] items-center justify-center"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      aria-hidden
                    >
                      <span
                        className="select-none font-bold leading-none text-lime-300 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] scale-[2.35] text-[0.75rem] sm:scale-[2.72] sm:text-[0.9rem]"
                      >
                        ☢
                      </span>
                    </div>
                  )
                })}
              </>
            )
          })()}
          {hostileProjectile ? (
            <div
              className="hostile-shot-ball absolute h-[min(6.7%,9px)] w-[min(6.7%,9px)] min-h-[7px] min-w-[7px] rounded-full bg-rose-600 shadow-[0_0_4px_rgba(190,18,60,0.7)]"
              style={
                {
                  '--hostile-start-x': `${
                    ((hostileProjectile.ex + 0.5 - camX) / viewCols) * 100
                  }%`,
                  '--hostile-start-y': `${
                    ((hostileProjectile.ey + 0.5 - camY) / viewRows) * 100
                  }%`,
                  '--hostile-end-x': `${pl}%`,
                  '--hostile-end-y': `${pt}%`,
                }
              }
            />
          ) : null}
          {entities
            .filter(
              (e) =>
                !e.defeated &&
                (e.kind === 'zombie' || e.kind === 'trader') &&
                revealed.has(cellKey(Math.floor(e.x), Math.floor(e.y))),
            )
            .filter((e) => {
              const el = ((e.x - camX) / viewCols) * 100
              const et = ((e.y - camY) / viewRows) * 100
              return el >= -15 && el <= 115 && et >= -15 && et <= 115
            })
            .map((e) => {
              const g = glyphForEntity(e)
              const el = ((e.x - camX) / viewCols) * 100
              const et = ((e.y - camY) / viewRows) * 100
              return (
                <div
                  key={e.id}
                  className="absolute flex h-[min(12%,18px)] w-[min(12%,18px)] min-h-[14px] min-w-[14px] items-center justify-center rounded-sm border border-current/55 text-[0.45rem] font-bold leading-none shadow-[0_0_10px_rgba(0,0,0,0.35)] sm:text-[0.5rem]"
                  style={{
                    left: `${el}%`,
                    top: `${et}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-hidden
                >
                  <span className={g?.tone ?? ''}>{g?.char}</span>
                </div>
              )
            })}
        </div>
        {(() => {
          const exitKey = cellKey(exitCell.x, exitCell.y)
          if (!revealed.has(exitKey)) return null
          if (
            exitCell.x < camX ||
            exitCell.x >= camX + viewCols ||
            exitCell.y < camY ||
            exitCell.y >= camY + viewRows
          ) {
            return null
          }
          const hl = ((exitCell.x - camX + 0.5) / viewCols) * 100
          const ht = ((exitCell.y - camY + 0.5) / viewRows) * 100
          return (
            <div
              className="pointer-events-none absolute inset-0 z-[11]"
              aria-hidden
            >
              <div
                className="helipad-map-pulse-wrap absolute"
                style={{ left: `${hl}%`, top: `${ht}%` }}
              >
                <span className="helipad-map-loc-ring" />
                <span className="helipad-map-loc-ring helipad-map-loc-ring--d1" />
                <span className="helipad-map-loc-ring helipad-map-loc-ring--d2" />
                <span className="helipad-map-loc-core" />
              </div>
            </div>
          )
        })()}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="w-full text-center text-xs text-amber-200/50">
          <span className="hidden sm:inline">
            Hold WASD / arrows ·{' '}
          </span>
          <span className="sm:hidden">Thumb pad below · </span>M minimap
          (pulsing dot = you) · Vault door start; revealed helipad = green
          beacon · Space fire · H medkit · 🏠 REST · + / ⚔ · Fog
          beyond sight
        </span>
        <TouchJoystick
          disabled={!movementEnabled}
          analogRef={touchAnalogRef}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-amber-200/60">
        <span>
          Vitals:{' '}
          <span
            className={
              health < STARTING_HEALTH * 0.35
                ? 'font-semibold text-rose-400'
                : 'text-amber-100'
            }
          >
            {health}
          </span>
          <span className="text-amber-200/40"> / {STARTING_HEALTH}</span>
        </span>
        <span>
          Ammo:{' '}
          <span className="font-mono font-semibold text-sky-200">
            {ammo}
          </span>
          <span className="text-amber-200/40"> (Space)</span>
        </span>
        <span>
          Medkits:{' '}
          <span className="font-mono font-semibold text-emerald-300">
            {healthPacks}
          </span>
          <span className="text-amber-200/40"> (H)</span>
        </span>
      </div>
    </div>
  )
}

import { cellKey } from '../../utils/helpers.js'
import {
  HELIPAD_ICON,
  HOUSE_MAP_ICON,
  pickupGoodLabel,
  wallDecor,
} from '../../utils/mapDecor.js'

/**
 * Full-world overlay: explored tiles from `revealed`; terrain hidden until seen.
 * Player dot always shown. Helipad / vault markers only on revealed tiles.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   worldCols: number
 *   worldRows: number
 *   wallSet: Set<string>
 *   revealed: Set<string>
 *   player: { x: number; y: number }
 *   exitCell: { x: number; y: number }
 *   spawnCell: { x: number; y: number }
 *   entities?: { id: string; kind: string; x: number; y: number; defeated?: boolean; pickupType?: string }[]
 *   pathSet?: Set<string>
 * }} props
 */
export function Minimap({
  open,
  onClose,
  worldCols,
  worldRows,
  wallSet,
  revealed,
  player,
  exitCell,
  spawnCell,
  entities = [],
  pathSet = new Set(),
}) {
  if (!open) return null

  const px = Math.floor(player.x)
  const py = Math.floor(player.y)

  function entityAt(tx, ty) {
    return entities.find((e) => e.x === tx && e.y === ty && !e.defeated)
  }

  const cells = []
  for (let y = 0; y < worldRows; y++) {
    for (let x = 0; x < worldCols; x++) {
      cells.push({ x, y })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Minimap"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-auto rounded-xl border-2 border-amber-800/70 bg-[#0f0d0a] p-3 shadow-[0_0_48px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-amber-200/90">
            Minimap — explored areas
          </p>
          <p className="text-[10px] text-amber-200/45">
            M / Esc · click outside to close
          </p>
        </div>
        <div
          className="relative mx-auto w-full rounded border border-amber-950/60 bg-black/40 p-0.5"
          style={{
            aspectRatio: `${worldCols} / ${worldRows}`,
            maxWidth: 'min(92vw, 420px)',
          }}
        >
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${worldCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${worldRows}, minmax(0, 1fr))`,
            }}
          >
            {cells.map(({ x, y }) => {
              const key = cellKey(x, y)
              const seen = revealed.has(key)
              const wall = wallSet.has(key)
              const isExit =
                x === exitCell.x && y === exitCell.y && seen && !wall
              const isVault =
                x === spawnCell.x &&
                y === spawnCell.y &&
                seen &&
                !wall &&
                !isExit
              const ent = !wall && seen ? entityAt(x, y) : null
              const goodMini = ent ? pickupGoodLabel(ent) : null
              const houseMini = ent?.kind === 'house'
              const wallDeco = wall && seen ? wallDecor(x, y) : null
              const onPath =
                seen &&
                !wall &&
                !isExit &&
                !isVault &&
                pathSet.size > 0 &&
                pathSet.has(key)

              if (!seen) {
                return (
                  <div
                    key={key}
                    className="relative min-h-0 min-w-0 bg-zinc-950"
                    title=""
                  />
                )
              }

              return (
                <div
                  key={key}
                  className={[
                    'relative flex min-h-0 min-w-0 flex-col items-center justify-center leading-none',
                    wall && wallDeco
                      ? wallDeco.cellClass
                      : isExit
                        ? 'bg-slate-900/85'
                        : isVault
                          ? 'bg-zinc-900/88'
                          : onPath
                          ? 'bg-[#4f463a]/92'
                          : 'bg-[#0f2418]/90',
                  ].join(' ')}
                  title={
                    wall && wallDeco
                      ? wallDeco.kind === 'rock'
                        ? 'Rock'
                        : 'Tree'
                      : isExit
                        ? 'Helipad'
                        : isVault
                          ? 'Vault exit'
                          : houseMini
                            ? 'Rest house'
                            : goodMini
                              ? goodMini.label
                              : onPath
                                ? 'Path'
                                : 'Grass'
                  }
                >
                  {wall && wallDeco ? (
                    <span
                      className={`pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 scale-[2.1] select-none text-[5px] sm:scale-[2.35] sm:text-[6px] ${wallDeco.iconClass} drop-shadow-sm`}
                      aria-hidden
                    >
                      {wallDeco.char}
                    </span>
                  ) : null}
                  {isExit ? (
                    <div className="relative z-[2] flex flex-col items-center justify-center leading-none">
                      <span
                        className="pointer-events-none select-none text-[5px] leading-none drop-shadow-sm sm:text-[6px]"
                        aria-hidden
                      >
                        {HELIPAD_ICON}
                      </span>
                      <span className="text-[3px] font-bold uppercase text-amber-200/95 sm:text-[4px]">
                        P
                      </span>
                    </div>
                  ) : null}
                  {isVault ? (
                    <div className="relative z-[2] flex flex-col items-center justify-center leading-none">
                      <span
                        className="pointer-events-none select-none text-[4px] opacity-90 sm:text-[5px]"
                        aria-hidden
                      >
                        🚪
                      </span>
                      <span className="text-[3px] font-semibold uppercase text-zinc-500 sm:text-[4px]">
                        V
                      </span>
                    </div>
                  ) : null}
                  {houseMini && !wall ? (
                    <div className="relative z-[2] flex flex-col items-center overflow-visible">
                      <span
                        className="pointer-events-none -mt-px scale-[2.05] select-none text-[5px] leading-none drop-shadow-sm sm:scale-[2.25] sm:text-[6px]"
                        aria-hidden
                      >
                        {HOUSE_MAP_ICON}
                      </span>
                      <span className="text-[3px] font-bold uppercase text-amber-200/95 sm:text-[4px]">
                        R
                      </span>
                    </div>
                  ) : null}
                  {goodMini && !wall ? (
                    <span
                      className={`select-none text-[4px] font-bold uppercase tracking-tighter sm:text-[5px] ${ent?.pickupType === 'health' ? 'text-emerald-400/95' : 'text-sky-300/95'}`}
                    >
                      {goodMini.short}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {revealed.has(cellKey(exitCell.x, exitCell.y)) ? (
            <div
              className="pointer-events-none absolute inset-0 z-[28] overflow-visible"
              aria-hidden
            >
              <div
                className="helipad-minimap-pulse-wrap absolute"
                style={{
                  left: `${((exitCell.x + 0.5) / worldCols) * 100}%`,
                  top: `${((exitCell.y + 0.5) / worldRows) * 100}%`,
                }}
              >
                <span className="helipad-minimap-loc-ring" />
                <span className="helipad-minimap-loc-ring helipad-minimap-loc-ring--d1" />
                <span className="helipad-minimap-loc-ring helipad-minimap-loc-ring--d2" />
                <span className="helipad-minimap-loc-core" />
              </div>
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 z-30 overflow-visible"
            aria-hidden
          >
            <div
              className="minimap-player-pulse-wrap absolute"
              style={{
                left: `${((px + 0.5) / worldCols) * 100}%`,
                top: `${((py + 0.5) / worldRows) * 100}%`,
              }}
            >
              <span className="minimap-loc-ring" />
              <span className="minimap-loc-ring minimap-loc-ring--d1" />
              <span className="minimap-loc-ring minimap-loc-ring--d2" />
              <span className="minimap-loc-core" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

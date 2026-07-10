import { DIFFICULTIES } from '../../utils/constants.js'

/**
 * @param {{
 *   onStart: () => void
 *   onDaily: () => void
 *   board: { entries: { score: number; name: string }[] }
 *   difficulty: string
 *   onSelectDifficulty: (key: string) => void
 *   seedLocked?: boolean
 * }} props
 */
export function HomeScreen({
  onStart,
  onDaily,
  board,
  difficulty,
  onSelectDifficulty,
  seedLocked = false,
}) {
  const best = board?.entries?.[0] ?? null
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c0a08] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 30%, rgba(192,127,46,0.14), transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(182,201,63,0.05), transparent 45%)',
        }}
        aria-hidden
      />
      <div className="animate-fade-in relative w-full max-w-md">
        <header className="text-center">
          <p className="text-[10px] font-bold tracking-[0.5em] text-amber-200/45">
            SECTOR 7 · EXTRACTION PROTOCOL
          </p>
          <h1
            className="mt-3 text-5xl font-black uppercase leading-none tracking-tight text-amber-100 sm:text-6xl"
            style={{ textShadow: '0 2px 0 #4a2c10, 0 5px 18px rgba(192,127,46,0.35)' }}
          >
            Wasteland
            <span className="block text-amber-400">Escape</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-amber-100/60">
            The vault door is open behind you and it will not open twice. Cross
            the wastes, put down ten of the walking dead, and reach the helipad
            before the rotors spin down.
          </p>
        </header>

        <div className="mt-8 rounded-xl border border-amber-100/15 bg-black/40 p-5 backdrop-blur-[2px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold tracking-[0.22em] text-amber-200/45">
                BEST RUN
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-amber-100">
                {best?.score ?? 0}
              </p>
              {best?.name ? (
                <p className="mt-0.5 text-xs text-amber-200/55">by {best.name}</p>
              ) : null}
            </div>
            <div className="text-right text-[11px] leading-relaxed text-amber-200/50">
              <p>10:00 on the clock</p>
              <p>10 hostiles to drop</p>
              <p>1 way out</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[9px] font-bold tracking-[0.22em] text-amber-200/45">
              THREAT LEVEL
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {Object.entries(DIFFICULTIES).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDifficulty(key)}
                  className={`rounded-md border px-2 py-2 text-center transition ${
                    difficulty === key
                      ? 'border-amber-400/60 bg-amber-800/40 text-amber-50'
                      : 'border-amber-100/10 bg-black/30 text-amber-200/50 hover:border-amber-200/30'
                  }`}
                >
                  <span className="block text-[11px] font-bold tracking-wider">
                    {d.label}
                  </span>
                  <span className="mt-0.5 block text-[9px] leading-tight opacity-70">
                    {d.blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {seedLocked ? (
            <p className="mt-3 rounded border border-amber-300/25 bg-amber-950/40 px-2 py-1 text-center font-mono text-[10px] tracking-wider text-amber-200/80">
              SEEDED RUN — this link always deals the same wasteland
            </p>
          ) : null}

          <button
            type="button"
            onClick={onStart}
            className="mt-5 w-full rounded-lg border-2 border-amber-400/50 bg-gradient-to-b from-amber-600/70 to-amber-800/70 px-6 py-3.5 text-base font-black uppercase tracking-[0.22em] text-amber-50 shadow-[0_4px_20px_rgba(192,127,46,0.3)] transition hover:from-amber-500/70 hover:to-amber-700/70 active:scale-[0.99]"
          >
            Exit the vault
          </button>
          <button
            type="button"
            onClick={onDaily}
            className="mt-2 w-full rounded-lg border border-amber-100/20 bg-black/40 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-200/75 transition hover:bg-black/60"
          >
            Daily run — same map for everyone today
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] tracking-wider text-amber-200/40">
          <div className="rounded-md border border-amber-100/10 bg-black/30 px-2 py-2">
            <p className="font-bold text-amber-200/60">MOVE</p>
            <p className="mt-0.5">WASD · stick</p>
          </div>
          <div className="rounded-md border border-amber-100/10 bg-black/30 px-2 py-2">
            <p className="font-bold text-amber-200/60">FIGHT</p>
            <p className="mt-0.5">SPACE · FIRE</p>
          </div>
          <div className="rounded-md border border-amber-100/10 bg-black/30 px-2 py-2">
            <p className="font-bold text-amber-200/60">SURVIVE</p>
            <p className="mt-0.5">H · MED</p>
          </div>
        </div>
      </div>
    </div>
  )
}

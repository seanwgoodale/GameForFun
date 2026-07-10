import { useState } from 'react'
import { LEADERBOARD_NAME_MAX_LENGTH } from '../../utils/constants.js'

const REASON_COPY = {
  extract: {
    tag: 'EXTRACTION CONFIRMED',
    tagTone: 'text-emerald-300 border-emerald-400/40',
    title: 'You made the pad',
    blurb: 'The rotors were still turning. Not everyone gets to leave this place — you did.',
  },
  death: {
    tag: 'SIGNAL LOST',
    tagTone: 'text-red-300 border-red-400/40',
    title: 'The wastes keep you',
    blurb: 'Somewhere out there, your radio hisses static at nobody. The vault logs one more name.',
  },
  time: {
    tag: 'ROTORS SPUN DOWN',
    tagTone: 'text-amber-300 border-amber-400/40',
    title: 'The helicopter left',
    blurb: 'You watched the dust-off from the wrong ridge. There is always another helicopter. Probably.',
  },
}

/**
 * @param {{
 *   score: number
 *   seed?: number | null
 *   endReason?: 'extract' | 'death' | 'time'
 *   board: { entries: { id: string; score: number; name: string; date: string; difficulty?: string }[] }
 *   rank: number | null
 *   entryId: string | null
 *   onSaveLeaderName: (name: string) => void
 *   onPlayAgain: () => void
 *   onHome: () => void
 * }} props
 */
export function EndScreen({
  score,
  seed = null,
  endReason = 'time',
  board,
  rank,
  entryId,
  onSaveLeaderName,
  onPlayAgain,
  onHome,
}) {
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const copy = REASON_COPY[endReason] ?? REASON_COPY.time
  const isNewRecord = rank === 1
  const entries = board?.entries ?? []

  const handleSubmitName = () => {
    const trimmed = nameInput.trim().slice(0, LEADERBOARD_NAME_MAX_LENGTH)
    if (trimmed) {
      onSaveLeaderName(trimmed)
      setNameSaved(true)
    }
  }

  const showNameInput = rank != null && entryId && !nameSaved

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c0a08] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            endReason === 'death'
              ? 'radial-gradient(ellipse at 50% 40%, rgba(178,58,58,0.16), transparent 60%)'
              : 'radial-gradient(ellipse at 50% 30%, rgba(192,127,46,0.14), transparent 55%)',
        }}
        aria-hidden
      />
      <div className="animate-fade-in relative w-full max-w-md">
        <header className="text-center">
          <span
            className={`inline-block rounded border bg-black/40 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.28em] ${copy.tagTone}`}
          >
            {copy.tag}
          </span>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-amber-100">
            {copy.title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-amber-100/60">
            {copy.blurb}
          </p>
        </header>

        <div className="mt-7 rounded-xl border border-amber-100/15 bg-black/40 p-5 text-center backdrop-blur-[2px]">
          <p className="text-[9px] font-bold tracking-[0.28em] text-amber-200/45">
            FINAL SCORE
          </p>
          <p className="mt-1 font-mono text-6xl font-black tabular-nums text-amber-100">
            {score}
          </p>
          {isNewRecord ? (
            <p className="mt-1 text-xs font-bold tracking-[0.2em] text-emerald-300">
              NEW RECORD
            </p>
          ) : rank != null ? (
            <p className="mt-1 text-xs font-bold tracking-[0.2em] text-amber-300">
              #{rank} ON THE BOARD
            </p>
          ) : null}
          {seed != null ? (
            <p className="mt-1 font-mono text-[10px] tracking-wider text-amber-200/40">
              SEED {seed} — add ?seed={seed} to the URL to replay this map
            </p>
          ) : null}

          {showNameInput ? (
            <div className="mt-5 border-t border-amber-100/10 pt-4">
              <p className="text-[9px] font-bold tracking-[0.22em] text-amber-200/45">
                CARVE YOUR NAME INTO THE BOARD
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) =>
                    setNameInput(e.target.value.slice(0, LEADERBOARD_NAME_MAX_LENGTH))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitName()}
                  maxLength={LEADERBOARD_NAME_MAX_LENGTH}
                  placeholder="Your name"
                  className="min-w-0 flex-1 rounded-lg border border-amber-100/20 bg-black/50 px-4 py-2.5 text-center font-mono text-amber-100 placeholder-amber-200/30 focus:border-amber-400/60 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSubmitName}
                  disabled={!nameInput.trim()}
                  className="rounded-lg border border-amber-400/40 bg-amber-800/50 px-4 py-2.5 text-sm font-bold tracking-wider text-amber-50 transition hover:bg-amber-700/50 disabled:opacity-40"
                >
                  SAVE
                </button>
              </div>
            </div>
          ) : null}

          {entries.length > 0 ? (
            <div className="mt-5 border-t border-amber-100/10 pt-4 text-left">
              <p className="text-center text-[9px] font-bold tracking-[0.22em] text-amber-200/45">
                THE BOARD
              </p>
              <ol className="mt-2 space-y-1">
                {entries.slice(0, 5).map((e, i) => (
                  <li
                    key={e.id}
                    className={`flex items-baseline justify-between rounded px-2 py-1 font-mono text-xs ${
                      e.id === entryId
                        ? 'bg-amber-900/40 text-amber-100'
                        : 'text-amber-200/60'
                    }`}
                  >
                    <span>
                      {i + 1}. {e.name || 'unnamed survivor'}
                      {e.difficulty ? (
                        <span className="ml-1.5 text-[9px] uppercase opacity-60">
                          {e.difficulty}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{e.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 rounded-lg border-2 border-amber-400/50 bg-gradient-to-b from-amber-600/70 to-amber-800/70 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-amber-50 transition hover:from-amber-500/70 hover:to-amber-700/70 active:scale-[0.99]"
          >
            Go again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex-1 rounded-lg border border-amber-100/20 bg-black/40 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-200/80 transition hover:bg-black/60"
          >
            Vault door
          </button>
        </div>
      </div>
    </div>
  )
}

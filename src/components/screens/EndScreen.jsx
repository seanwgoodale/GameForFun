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
 *   endReason?: 'extract' | 'death' | 'time'
 *   leaderboard: { score: number; name: string }
 *   isNewRecord: boolean
 *   onSaveLeaderName: (name: string) => void
 *   onPlayAgain: () => void
 *   onHome: () => void
 * }} props
 */
export function EndScreen({
  score,
  endReason = 'time',
  leaderboard,
  isNewRecord,
  onSaveLeaderName,
  onPlayAgain,
  onHome,
}) {
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const highScore = leaderboard?.score ?? 0
  const leaderName = leaderboard?.name ?? ''
  const copy = REASON_COPY[endReason] ?? REASON_COPY.time

  const handleSubmitName = () => {
    const trimmed = nameInput.trim().slice(0, LEADERBOARD_NAME_MAX_LENGTH)
    if (trimmed) {
      onSaveLeaderName(trimmed)
      setNameSaved(true)
    }
  }

  const showNameInput = isNewRecord && !nameSaved

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

          <div className="mt-5 border-t border-amber-100/10 pt-4">
            <p className="text-[9px] font-bold tracking-[0.22em] text-amber-200/45">
              BEST SO FAR
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-100/90">
              {highScore}
            </p>
            {leaderName ? (
              <p className="mt-0.5 text-xs text-amber-200/55">by {leaderName}</p>
            ) : null}
          </div>
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

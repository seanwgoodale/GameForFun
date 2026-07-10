import { Button } from '../ui/Button.jsx'
import { ProgressBar } from './ProgressBar.jsx'
import { ScenarioCard } from './ScenarioCard.jsx'

/**
 * @param {{
 *   open: boolean
 *   badgeLabel: string
 *   title: string
 *   prompt: string
 *   options: string[]
 *   onSelect: (index: number) => void
 *   weapons: number
 *   weaponKillChancePercent: number
 *   onTryWeapon: () => void
 *   weaponFeedback: 'hit' | 'miss' | null
 *   showPlayerVitals?: boolean
 *   playerHealth?: number
 *   playerHealthMax?: number
 *   encounterStep?: 'question' | 'reward'
 *   isTrader?: boolean
 *   onPickReward?: (choice: 'ammo' | 'health') => void
 * }} props
 */
export function EncounterModal({
  open,
  badgeLabel,
  title,
  prompt,
  options,
  onSelect,
  weapons,
  weaponKillChancePercent,
  onTryWeapon,
  weaponFeedback,
  showPlayerVitals = false,
  playerHealth = 0,
  playerHealthMax = 100,
  encounterStep = 'question',
  isTrader = false,
  onPickReward,
}) {
  if (!open) return null

  const inRewardStep = encounterStep === 'reward' && isTrader

  if (inRewardStep && onPickReward) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
      >
        <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-emerald-800/50 bg-[#14110d] p-6">
          <h2 id="reward-title" className="text-lg font-semibold text-emerald-200">
            Trade successful
          </h2>
          <p className="mt-2 text-sm text-amber-200/80">
            Pick a reward:
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => onPickReward('ammo')}
              className="flex-1 rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-center font-medium text-amber-100 transition hover:border-amber-600/80 hover:bg-amber-900/30"
            >
              5 Ammo
            </button>
            <button
              type="button"
              onClick={() => onPickReward('health')}
              className="flex-1 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-center font-medium text-emerald-100 transition hover:border-emerald-600/80 hover:bg-emerald-900/30"
            >
              5 Health Packs
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="encounter-title"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto">
        {showPlayerVitals ? (
          <div className="mb-3 rounded-xl border border-emerald-800/50 bg-emerald-950/25 px-4 py-3">
            <ProgressBar
              variant="vitals"
              label="Your vitals"
              value={playerHealth}
              max={playerHealthMax}
            />
            <p className="mt-2 text-[11px] leading-snug text-emerald-200/55">
              Wrong answers and missed shots drain this bar — watch it drop when
              you fire and miss.
            </p>
          </div>
        ) : null}
        <ScenarioCard
          badgeLabel={badgeLabel}
          headingId="encounter-title"
          title={title}
          prompt={prompt}
          options={options}
          step={0}
          totalSteps={1}
          onSelect={onSelect}
        />

        {weaponFeedback === 'miss' ? (
          <p className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-center text-sm text-rose-200/95">
            Miss — ricochet and noise cost you. You took vitals damage; the
            threat is still up. Answer the prompt or try another shot if you
            have charges.
          </p>
        ) : null}

        {weapons > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-800/60 bg-[#14110d] p-4">
            <p className="text-xs uppercase tracking-wide text-amber-200/45">
              Sidearm charges
            </p>
            <p className="mt-1 text-sm text-amber-100/90">
              {isTrader ? (
                <>
                  You have{' '}
                  <span className="font-mono font-semibold text-amber-300">
                    {weapons}
                  </span>{' '}
                  shot{weapons === 1 ? '' : 's'}. Shooting angers them — they
                  turn green and won&apos;t trade for 5 minutes.
                </>
              ) : (
                <>
                  You have{' '}
                  <span className="font-mono font-semibold text-amber-300">
                    {weapons}
                  </span>{' '}
                  shot{weapons === 1 ? '' : 's'}. Each use is consumed. Clear
                  chance:{' '}
                  <span className="font-mono text-amber-200">
                    {weaponKillChancePercent}%
                  </span>{' '}
                  — a miss also costs vitals.
                </>
              )}
            </p>
            <Button
              type="button"
              variant="danger"
              className="mt-3 w-full py-2.5"
              onClick={onTryWeapon}
            >
              Fire sidearm
            </Button>
          </div>
        ) : null}

        <p className="mt-3 text-center text-xs text-amber-200/50">
          Wrong answers cost vitals. Scavenge + and ⚔ on the map for vitals and
          extra shots.
        </p>
      </div>
    </div>
  )
}

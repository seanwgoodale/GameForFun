import { MAX_HEALTH } from '../../utils/constants.js'

/** Human-readable chips for an outcome's mechanical effects. */
function effectChips(effects = {}) {
  const chips = []
  if (effects.health)
    chips.push({
      text: `${effects.health > 0 ? '+' : ''}${effects.health} VITALS`,
      tone: effects.health > 0 ? 'text-emerald-300 border-emerald-400/30' : 'text-red-300 border-red-400/30',
    })
  if (effects.ammo)
    chips.push({
      text: `${effects.ammo > 0 ? '+' : ''}${effects.ammo} AMMO`,
      tone: 'text-amber-200 border-amber-300/30',
    })
  if (effects.medkits)
    chips.push({
      text: `${effects.medkits > 0 ? '+' : ''}${effects.medkits} MEDKIT${Math.abs(effects.medkits) === 1 ? '' : 'S'}`,
      tone: 'text-emerald-300 border-emerald-400/30',
    })
  if (effects.score)
    chips.push({ text: `+${effects.score} SCORE`, tone: 'text-amber-100 border-amber-200/30' })
  if (effects.kill)
    chips.push({ text: 'HOSTILE DOWN', tone: 'text-red-200 border-red-300/40' })
  if (effects.trade)
    chips.push({ text: 'DEAL STRUCK', tone: 'text-emerald-200 border-emerald-300/40' })
  if (effects.anger)
    chips.push({ text: 'THEY WON’T FORGET', tone: 'text-orange-300 border-orange-400/40' })
  return chips
}

function costLabel(cost) {
  if (!cost) return null
  const parts = []
  if (cost.ammo) parts.push(`${cost.ammo} AMMO`)
  if (cost.medkits) parts.push(`${cost.medkits} MEDKIT${cost.medkits === 1 ? '' : 'S'}`)
  return parts.join(' + ')
}

/**
 * Diegetic encounter card: situation → choices → outcome.
 * @param {{
 *   open: boolean
 *   encounter: import('../../data/encounters.js').Encounter | null
 *   step: 'choice' | 'result'
 *   result: { text: string; effects: object } | null
 *   health: number
 *   ammo: number
 *   medkits: number
 *   onChoose: (index: number) => void
 *   onContinue: () => void
 * }} props
 */
export function EncounterPanel({
  open,
  encounter,
  step,
  result,
  health,
  ammo,
  medkits,
  onChoose,
  onContinue,
}) {
  if (!open || !encounter) return null

  const hostile = encounter.kind === 'zombie'
  const healthFrac = Math.max(0, Math.min(1, health / MAX_HEALTH))

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/55 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="encounter-title"
    >
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-amber-100/20 bg-[#141009]/95 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-2.5 ${
            hostile ? 'border-red-400/20 bg-red-950/30' : 'border-amber-300/15 bg-amber-950/25'
          }`}
        >
          <span
            className={`text-[10px] font-bold tracking-[0.22em] ${
              hostile ? 'text-red-300' : 'text-amber-300'
            }`}
          >
            {hostile ? 'HOSTILE CONTACT' : 'SURVIVOR CONTACT'}
          </span>
          <span className="flex items-center gap-3 font-mono text-[10px] text-amber-200/70">
            <span>AMMO {ammo}</span>
            <span>MED {medkits}</span>
          </span>
        </div>

        <div className="p-4">
          {/* Vitals strip */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-[0.18em] text-amber-200/50">
              VITALS
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-black/60">
              <div
                className={`h-full ${
                  healthFrac < 0.3 ? 'bg-red-500' : healthFrac < 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${healthFrac * 100}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-amber-100/80">
              {Math.round(health)}
            </span>
          </div>

          <h2 id="encounter-title" className="text-base font-semibold tracking-wide text-amber-50">
            {encounter.title}
          </h2>

          {step === 'choice' ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
                {encounter.text}
              </p>
              <div className="mt-4 space-y-2">
                {encounter.choices.map((choice, i) => {
                  const cost = costLabel(choice.cost)
                  const affordable =
                    ammo >= (choice.cost?.ammo ?? 0) &&
                    medkits >= (choice.cost?.medkits ?? 0)
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      disabled={!affordable}
                      onClick={() => onChoose(i)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-amber-100/15 bg-black/30 px-3.5 py-2.5 text-left transition hover:border-amber-200/40 hover:bg-amber-100/5 active:bg-amber-100/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>
                        <span className="block text-sm font-medium text-amber-50">
                          {choice.label}
                        </span>
                        {choice.detail ? (
                          <span className="block text-[11px] text-amber-200/55">
                            {choice.detail}
                          </span>
                        ) : null}
                      </span>
                      {cost ? (
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${
                            affordable
                              ? 'border-amber-300/30 text-amber-200'
                              : 'border-red-400/30 text-red-300'
                          }`}
                        >
                          −{cost}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
                {result?.text}
              </p>
              {result?.effects && effectChips(result.effects).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {effectChips(result.effects).map((chip) => (
                    <span
                      key={chip.text}
                      className={`rounded border bg-black/40 px-2 py-0.5 font-mono text-[10px] tracking-wider ${chip.tone}`}
                    >
                      {chip.text}
                    </span>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={onContinue}
                className="mt-4 w-full rounded-lg border border-amber-300/40 bg-amber-800/40 px-4 py-2.5 text-sm font-bold tracking-[0.14em] text-amber-50 transition hover:bg-amber-700/40 active:scale-[0.99]"
              >
                CONTINUE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

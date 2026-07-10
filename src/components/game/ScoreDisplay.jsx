/**
 * @param {{ score: number; label?: string; variant?: 'default' | 'vault' }} props
 */
export function ScoreDisplay({
  score,
  label = 'Score',
  variant = 'default',
}) {
  const vault = variant === 'vault'

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={`text-sm ${vault ? 'text-amber-200/55' : 'text-slate-400'}`}
      >
        {label}
      </span>
      <span
        className={`text-2xl font-semibold tabular-nums ${
          vault ? 'text-amber-50' : 'text-slate-50'
        }`}
      >
        {score}
      </span>
    </div>
  )
}

/**
 * @param {{ value: number; max: number; label?: string; variant?: 'default' | 'vitals' }} props
 */
export function ProgressBar({ value, max, label, variant = 'default' }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  const vitals = variant === 'vitals'

  return (
    <div className="w-full space-y-2">
      {label ? (
        <div
          className={`flex justify-between text-xs ${vitals ? 'text-emerald-200/70' : 'text-slate-400'}`}
        >
          <span>{label}</span>
          <span
            className={`tabular-nums ${vitals ? 'text-emerald-100/90' : 'text-slate-500'}`}
          >
            {value}/{max}
          </span>
        </div>
      ) : null}
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${vitals ? 'bg-emerald-950/80 ring-1 ring-emerald-700/40' : 'bg-slate-800'}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            vitals
              ? 'bg-gradient-to-r from-emerald-600 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
              : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

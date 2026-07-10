import { formatTime } from '../../utils/helpers.js'

/**
 * @param {{ remainingSec: number; label?: string; variant?: 'default' | 'vault' }} props
 */
export function Timer({
  remainingSec,
  label = 'Time left',
  variant = 'default',
}) {
  const urgent = remainingSec <= 10

  const vault = variant === 'vault'

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        urgent
          ? 'border-rose-500/40 bg-rose-950/40 animate-pulse-soft'
          : vault
            ? 'border-amber-900/50 bg-[#14110d]'
            : 'border-slate-700/80 bg-slate-900/50'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`text-sm ${vault ? 'text-amber-200/55' : 'text-slate-400'}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-lg tabular-nums ${
          urgent
            ? 'text-rose-300'
            : vault
              ? 'text-amber-100'
              : 'text-slate-100'
        }`}
      >
        {formatTime(remainingSec)}
      </span>
    </div>
  )
}

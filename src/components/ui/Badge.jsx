const tones = {
  default: 'bg-slate-800 text-slate-200 ring-slate-700',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-200 ring-rose-500/35',
}

/**
 * @param {import('react').HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }} props
 */
export function Badge({ children, tone = 'default', className = '', ...props }) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset'

  return (
    <span className={`${base} ${tones[tone]} ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}

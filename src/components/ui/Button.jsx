const variants = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:ring-indigo-400/80',
  secondary:
    'bg-slate-800 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700 focus-visible:ring-slate-500',
  ghost:
    'bg-transparent text-slate-200 hover:bg-slate-800/80 focus-visible:ring-slate-500',
  danger:
    'bg-rose-600/90 text-white hover:bg-rose-500 focus-visible:ring-rose-400',
}

/**
 * @param {import('react').ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }} props
 */
export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ' +
    'disabled:pointer-events-none disabled:opacity-40'

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}

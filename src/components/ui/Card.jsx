/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

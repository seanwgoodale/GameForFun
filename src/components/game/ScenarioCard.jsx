import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'

/**
 * @param {{
 *   badgeLabel?: string
 *   headingId?: string
 *   title: string
 *   prompt: string
 *   options: string[]
 *   step: number
 *   totalSteps: number
 *   onSelect: (index: number) => void
 * }} props
 */
export function ScenarioCard({
  badgeLabel = 'Encounter',
  headingId,
  title,
  prompt,
  options,
  step,
  totalSteps,
  onSelect,
}) {
  return (
    <Card className="animate-slide-up space-y-5 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">{badgeLabel}</Badge>
        <span className="text-xs text-slate-500">
          {step + 1} / {totalSteps}
        </span>
      </div>
      <div>
        <h2
          id={headingId}
          className="text-lg font-semibold text-slate-50"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{prompt}</p>
      </div>
      <ul className="space-y-2">
        {options.map((opt, i) => (
          <li key={opt}>
            <Button
              variant="secondary"
              className="h-auto w-full justify-start px-4 py-3 text-left text-sm leading-snug"
              onClick={() => onSelect(i)}
            >
              <span className="mr-3 font-mono text-xs text-slate-500">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

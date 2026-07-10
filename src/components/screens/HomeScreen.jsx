import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'

/**
 * @param {{ onStart: () => void; leaderboard: { score: number; name: string } }} props
 */
export function HomeScreen({ onStart, leaderboard }) {
  const { score, name } = leaderboard ?? { score: 0, name: '' }
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-12 animate-fade-in">
      <header className="space-y-3 text-center">
        <Badge tone="success">Wasteland op</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
          Wasteland Escape
        </h1>
        <p className="text-slate-400">
          You&apos;re at the vault hatch. Step outside into the wastes, thread
          hotspots and hostiles, and reach the helipad before the clock hits
          zero.
        </p>
      </header>

      <Card className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Best run
            </p>
            <p className="text-2xl font-semibold tabular-nums text-slate-50">
              {score}
            </p>
            {name ? (
              <p className="mt-0.5 text-sm text-slate-400">by {name}</p>
            ) : null}
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>Timer: 10:00</p>
            <p>Smooth movement · line of sight · roaming threats</p>
          </div>
        </div>
        <Button className="w-full py-3 text-base" onClick={onStart}>
          Exit the vault
        </Button>
      </Card>
    </div>
  )
}

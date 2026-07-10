import { useState } from 'react'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { LEADERBOARD_NAME_MAX_LENGTH } from '../../utils/constants.js'

/**
 * @param {{
 *   score: number
 *   leaderboard: { score: number; name: string }
 *   isNewRecord: boolean
 *   onSaveLeaderName: (name: string) => void
 *   onPlayAgain: () => void
 *   onHome: () => void
 * }} props
 */
export function EndScreen({
  score,
  leaderboard,
  isNewRecord,
  onSaveLeaderName,
  onPlayAgain,
  onHome,
}) {
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const highScore = leaderboard?.score ?? 0
  const leaderName = leaderboard?.name ?? ''

  const handleSubmitName = () => {
    const trimmed = nameInput.trim().slice(0, LEADERBOARD_NAME_MAX_LENGTH)
    if (trimmed) {
      onSaveLeaderName(trimmed)
      setNameSaved(true)
    }
  }

  const showNameInput = isNewRecord && !nameSaved

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-12 animate-fade-in">
      <header className="space-y-2 text-center">
        {isNewRecord ? (
          <Badge tone="success">New high score</Badge>
        ) : (
          <Badge>Run complete</Badge>
        )}
        <h1 className="text-3xl font-semibold text-slate-50">Time&apos;s up</h1>
        <p className="text-slate-400">Here&apos;s how this round shaped up.</p>
      </header>

      <Card className="space-y-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Your score
          </p>
          <p className="mt-1 text-5xl font-semibold tabular-nums text-slate-50">
            {score}
          </p>
        </div>
        {showNameInput ? (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Leave your name on the board
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, LEADERBOARD_NAME_MAX_LENGTH))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitName()}
                maxLength={LEADERBOARD_NAME_MAX_LENGTH}
                placeholder="Your name"
                className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-center text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <Button
                type="button"
                onClick={handleSubmitName}
                disabled={!nameInput.trim()}
              >
                Save
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Max {LEADERBOARD_NAME_MAX_LENGTH} characters
            </p>
          </div>
        ) : null}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Best so far
          </p>
          <p className="mt-1 text-2xl font-medium tabular-nums text-slate-200">
            {highScore}
          </p>
          {leaderName ? (
            <p className="mt-0.5 text-sm text-slate-400">by {leaderName}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1 py-3" onClick={onPlayAgain}>
            Play again
          </Button>
          <Button variant="secondary" className="flex-1 py-3" onClick={onHome}>
            Home
          </Button>
        </div>
      </Card>
    </div>
  )
}

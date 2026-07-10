import { useCallback, useMemo, useState } from 'react'
import { EndScreen } from './components/screens/EndScreen.jsx'
import { GameScreen } from './components/screens/GameScreen.jsx'
import { HomeScreen } from './components/screens/HomeScreen.jsx'
import { useGame } from './hooks/useGame.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  STORAGE_KEYS,
} from './utils/constants.js'
import {
  dailySeed,
  hashSeed,
  insertScore,
  nameEntry,
  normalizeBoard,
} from './utils/leaderboard.js'

/** ?seed=123 or ?seed=any-string locks the map; shared links replay it. */
function seedFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('seed')
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n >>> 0 : hashSeed(raw)
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [runKey, setRunKey] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [lastSeed, setLastSeed] = useState(null)
  const [endReason, setEndReason] = useState('time')
  const [lastEntry, setLastEntry] = useState({ id: null, rank: null })
  const [urlSeed] = useState(seedFromUrl)

  const game = useGame()
  const [difficulty, setDifficulty] = useLocalStorage(
    STORAGE_KEYS.difficulty,
    DEFAULT_DIFFICULTY,
  )
  const safeDifficulty = DIFFICULTIES[difficulty]
    ? difficulty
    : DEFAULT_DIFFICULTY

  const [stored, setStored] = useLocalStorage(STORAGE_KEYS.highScore, null)
  const board = useMemo(() => normalizeBoard(stored), [stored])

  const startRun = useCallback(
    (seed) => {
      game.startGame({ difficulty: safeDifficulty, seed })
      setRunKey((k) => k + 1)
      setScreen('game')
    },
    [game, safeDifficulty],
  )

  const handleStart = () => startRun(urlSeed)
  const handleDaily = () => startRun(dailySeed())

  const handleTimeUp = useCallback(
    (finalScore, reason = 'time') => {
      setLastScore(finalScore)
      setLastSeed(game.seed ?? null)
      setEndReason(reason)
      const result = insertScore(board, {
        score: finalScore,
        difficulty: game.difficulty,
        seed: game.seed ?? null,
      })
      setLastEntry({ id: result.entryId, rank: result.rank })
      if (result.rank != null) setStored(result.board)
      setScreen('end')
    },
    [board, game.seed, game.difficulty, setStored],
  )

  const handleSaveLeaderName = useCallback(
    (name) => {
      if (!lastEntry.id) return
      setStored((prev) => nameEntry(normalizeBoard(prev), lastEntry.id, name))
    },
    [lastEntry.id, setStored],
  )

  const handlePlayAgain = () => startRun(urlSeed)

  const handleHome = () => {
    game.reset()
    setScreen('home')
  }

  return (
    <div className="min-h-dvh bg-[#0c0a08]">
      {screen === 'home' ? (
        <HomeScreen
          onStart={handleStart}
          onDaily={handleDaily}
          board={board}
          difficulty={safeDifficulty}
          onSelectDifficulty={setDifficulty}
          seedLocked={urlSeed != null}
        />
      ) : null}
      {screen === 'game' ? (
        <GameScreen key={runKey} onTimeUp={handleTimeUp} game={game} />
      ) : null}
      {screen === 'end' ? (
        <EndScreen
          score={lastScore}
          seed={lastSeed}
          endReason={endReason}
          board={board}
          rank={lastEntry.rank}
          entryId={lastEntry.id}
          onSaveLeaderName={handleSaveLeaderName}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      ) : null}
    </div>
  )
}

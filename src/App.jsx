import { useCallback, useMemo, useState } from 'react'
import { EndScreen } from './components/screens/EndScreen.jsx'
import { GameScreen } from './components/screens/GameScreen.jsx'
import { HomeScreen } from './components/screens/HomeScreen.jsx'
import { useGame } from './hooks/useGame.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { LEADERBOARD_NAME_MAX_LENGTH, STORAGE_KEYS } from './utils/constants.js'

const defaultLeaderboard = { score: 0, name: '' }

export default function App() {
  const [screen, setScreen] = useState('home')
  const [runKey, setRunKey] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [endReason, setEndReason] = useState('time')
  const [isNewRecord, setIsNewRecord] = useState(false)

  const game = useGame()
  const [stored, setStored] = useLocalStorage(
    STORAGE_KEYS.highScore,
    defaultLeaderboard,
  )
  const leaderboard = useMemo(() => {
    if (typeof stored === 'number') return { score: stored, name: '' }
    return stored && typeof stored.score === 'number'
      ? { score: stored.score, name: String(stored.name ?? '').slice(0, LEADERBOARD_NAME_MAX_LENGTH) }
      : defaultLeaderboard
  }, [stored])

  const handleStart = () => {
    game.startGame()
    setRunKey((k) => k + 1)
    setScreen('game')
  }

  const handleTimeUp = useCallback(
    (finalScore, reason = 'time') => {
      setLastScore(finalScore)
      setEndReason(reason)
      const newRecord = finalScore > leaderboard.score && finalScore > 0
      setIsNewRecord(newRecord)
      if (newRecord) {
        setStored({ score: finalScore, name: '' })
      }
      setScreen('end')
    },
    [leaderboard.score, setStored],
  )

  const handleSaveLeaderName = useCallback(
    (name) => {
      const trimmed = String(name ?? '').slice(0, LEADERBOARD_NAME_MAX_LENGTH)
      setStored({ score: lastScore, name: trimmed })
    },
    [lastScore, setStored],
  )

  const handlePlayAgain = () => {
    game.startGame()
    setRunKey((k) => k + 1)
    setScreen('game')
  }

  const handleHome = () => {
    game.reset()
    setScreen('home')
  }

  return (
    <div className="min-h-dvh bg-slate-950">
      {screen === 'home' ? (
        <HomeScreen onStart={handleStart} leaderboard={leaderboard} />
      ) : null}
      {screen === 'game' ? (
        <GameScreen
          key={runKey}
          onTimeUp={handleTimeUp}
          game={game}
        />
      ) : null}
      {screen === 'end' ? (
        <EndScreen
          score={lastScore}
          endReason={endReason}
          leaderboard={leaderboard}
          isNewRecord={isNewRecord}
          onSaveLeaderName={handleSaveLeaderName}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      ) : null}
    </div>
  )
}

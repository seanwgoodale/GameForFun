import { useMemo, useSyncExternalStore } from 'react'
import { GameStore } from '../game/store.js'

/** One store for the app; a new world is created per run inside it. */
const store = new GameStore()

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Dev-only handle for debugging / driving the sim from the console.
  window.__game = store
}

/**
 * Thin binding to the game store. All simulation logic lives in `src/game/`;
 * this only subscribes to snapshots and exposes the store's actions.
 */
export function useGame() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return useMemo(
    () => ({
      ...snapshot,
      moveKeysRef: store.moveKeysRef,
      touchAnalogRef: store.touchAnalogRef,
      startGame: store.startGame,
      reset: store.reset,
      stopGame: store.stopGame,
      clearPendingEnd: store.clearPendingEnd,
      submitEncounterAnswer: store.submitEncounterAnswer,
      pickTraderReward: store.pickTraderReward,
      tryWeaponOnEncounter: store.tryWeaponOnEncounter,
      fireRangedWeapon: store.fireRangedWeapon,
      useHealthPack: store.useHealthPack,
    }),
    [snapshot],
  )
}

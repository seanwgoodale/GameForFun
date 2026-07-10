import { GameStore } from './store.js'

/**
 * The app's single store instance. The React hook, the canvas renderer, and
 * the audio system all share it; each run swaps in a fresh world inside it.
 */
export const store = new GameStore()

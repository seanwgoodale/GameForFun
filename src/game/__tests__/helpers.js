import { cellKey } from '../../utils/helpers.js'
import { createWorld } from '../world.js'

/**
 * Minimal open arena with border walls, sized for deterministic tests.
 * Player starts mid-field; playing is on.
 */
export function makeTestWorld({ cols = 12, rows = 10 } = {}) {
  const world = createWorld()
  world.cols = cols
  world.rows = rows
  world.wallSet = new Set()
  for (let x = 0; x < cols; x++) {
    world.wallSet.add(cellKey(x, 0))
    world.wallSet.add(cellKey(x, rows - 1))
  }
  for (let y = 0; y < rows; y++) {
    world.wallSet.add(cellKey(0, y))
    world.wallSet.add(cellKey(cols - 1, y))
  }
  world.player = { x: cols / 2 + 0.5, y: rows / 2 + 0.5 }
  world.exitCell = { x: cols - 2, y: rows - 2 }
  world.spawnCell = { x: 1, y: 1 }
  world.playing = true
  return world
}

/** Deterministic "RNG" that returns the given values in order, then repeats the last. */
export function seqRng(values) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

let idCounter = 0
export function makeZombie(tx, ty, overrides = {}) {
  return {
    id: `test-z-${idCounter++}`,
    kind: 'zombie',
    x: tx + 0.5,
    y: ty + 0.5,
    scenarioId: 'z-lunge',
    moveDirX: 1,
    moveDirY: 0,
    tilesLeftInDir: 2,
    ...overrides,
  }
}

export function makeTrader(tx, ty, overrides = {}) {
  return {
    id: `test-t-${idCounter++}`,
    kind: 'trader',
    x: tx + 0.5,
    y: ty + 0.5,
    scenarioId: 't-caravan',
    moveDirX: 1,
    moveDirY: 0,
    tilesLeftInDir: 2,
    ...overrides,
  }
}

import { describe, expect, it } from 'vitest'
import { WORLD_COLS, WORLD_ROWS } from '../../utils/constants.js'
import { cellKey } from '../../utils/helpers.js'
import { generateLevel, tickEntityPositions } from '../levelGen.js'
import { makeTestWorld } from './helpers.js'

function bfsReachable(wallSet, cols, rows, from) {
  const seen = new Set([cellKey(from.x, from.y)])
  const queue = [from]
  while (queue.length) {
    const { x, y } = queue.shift()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
      const k = cellKey(nx, ny)
      if (seen.has(k) || wallSet.has(k)) continue
      seen.add(k)
      queue.push({ x: nx, y: ny })
    }
  }
  return seen
}

describe('generateLevel', () => {
  const level = generateLevel({ cols: WORLD_COLS, rows: WORLD_ROWS, seed: 1234 })

  it('is deterministic for a given seed', () => {
    const again = generateLevel({ cols: WORLD_COLS, rows: WORLD_ROWS, seed: 1234 })
    expect([...again.wallSet].sort()).toEqual([...level.wallSet].sort())
    expect(again.exitCell).toEqual(level.exitCell)
    expect(again.entities.map((e) => e.id)).toEqual(level.entities.map((e) => e.id))
  })

  it('keeps spawn and exit off walls', () => {
    expect(level.wallSet.has(cellKey(level.playerStart.x, level.playerStart.y))).toBe(false)
    expect(level.wallSet.has(cellKey(level.exitCell.x, level.exitCell.y))).toBe(false)
  })

  it('has a fully walled border', () => {
    for (let x = 0; x < WORLD_COLS; x++) {
      expect(level.wallSet.has(cellKey(x, 0))).toBe(true)
      expect(level.wallSet.has(cellKey(x, WORLD_ROWS - 1))).toBe(true)
    }
    for (let y = 0; y < WORLD_ROWS; y++) {
      expect(level.wallSet.has(cellKey(0, y))).toBe(true)
      expect(level.wallSet.has(cellKey(WORLD_COLS - 1, y))).toBe(true)
    }
  })

  it('makes the exit reachable from spawn', () => {
    const reachable = bfsReachable(level.wallSet, WORLD_COLS, WORLD_ROWS, level.playerStart)
    expect(reachable.has(cellKey(level.exitCell.x, level.exitCell.y))).toBe(true)
  })

  it('spawns every entity kind, none on walls', () => {
    const kinds = new Set(level.entities.map((e) => e.kind))
    for (const kind of ['zombie', 'trader', 'radiation', 'pickup', 'house']) {
      expect(kinds.has(kind)).toBe(true)
    }
    for (const e of level.entities) {
      const tx = Math.floor(e.x)
      const ty = Math.floor(e.y)
      expect(level.wallSet.has(cellKey(tx, ty))).toBe(false)
    }
  })

  it('gives every zombie and trader a scenario', () => {
    for (const e of level.entities) {
      if (e.kind === 'zombie' || e.kind === 'trader') {
        expect(e.scenarioId).toBeTruthy()
      }
    }
  })
})

describe('tickEntityPositions', () => {
  it('moves hostiles only onto open tiles and never onto the exit', () => {
    const world = makeTestWorld({ cols: 8, rows: 8 })
    const entities = [
      { id: 'z1', kind: 'zombie', x: 2.5, y: 2.5, moveDirX: 1, moveDirY: 0, tilesLeftInDir: 3 },
    ]
    let current = entities
    const rand = () => 0.5
    for (let step = 0; step < 20; step++) {
      current = tickEntityPositions(
        current,
        world.wallSet,
        world.cols,
        world.rows,
        world.exitCell,
        { x: 6.5, y: 6.5 },
        rand,
      )
      const z = current[0]
      const tx = Math.floor(z.x)
      const ty = Math.floor(z.y)
      expect(world.wallSet.has(cellKey(tx, ty))).toBe(false)
      expect(tx === world.exitCell.x && ty === world.exitCell.y).toBe(false)
    }
  })

  it('leaves radiation and defeated entities in place', () => {
    const world = makeTestWorld({ cols: 8, rows: 8 })
    const entities = [
      { id: 'r1', kind: 'radiation', x: 3, y: 3 },
      { id: 'z1', kind: 'zombie', x: 2.5, y: 2.5, defeated: true },
    ]
    const moved = tickEntityPositions(
      entities,
      world.wallSet,
      world.cols,
      world.rows,
      world.exitCell,
      { x: 6.5, y: 6.5 },
      () => 0.5,
    )
    expect(moved[0]).toMatchObject({ x: 3, y: 3 })
    expect(moved[1]).toMatchObject({ x: 2.5, y: 2.5 })
  })
})

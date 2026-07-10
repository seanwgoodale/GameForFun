import { describe, expect, it } from 'vitest'
import { cellKey } from '../../utils/helpers.js'
import {
  circleHitsWall,
  circleRectOverlap,
  distSq,
  distSqToTileCenter,
  stepSmoothPlayer,
} from '../movement.js'

const R = 0.29

function borderWalls(cols, rows) {
  const walls = new Set()
  for (let x = 0; x < cols; x++) {
    walls.add(cellKey(x, 0))
    walls.add(cellKey(x, rows - 1))
  }
  for (let y = 0; y < rows; y++) {
    walls.add(cellKey(0, y))
    walls.add(cellKey(cols - 1, y))
  }
  return walls
}

describe('circleRectOverlap', () => {
  it('detects overlap and separation', () => {
    expect(circleRectOverlap(0.5, 0.5, 0.3, 0, 0, 1, 1)).toBe(true)
    expect(circleRectOverlap(2.5, 0.5, 0.3, 0, 0, 1, 1)).toBe(false)
    // touching exactly at distance r is not overlap (strict <)
    expect(circleRectOverlap(1.3, 0.5, 0.3, 0, 0, 1, 1)).toBe(false)
  })
})

describe('stepSmoothPlayer', () => {
  it('moves at speed*dt in open space', () => {
    const walls = borderWalls(10, 10)
    const out = stepSmoothPlayer(5, 5, 0.1, 1, 0, 4, walls, 10, 10, R)
    expect(out.x).toBeCloseTo(5.4, 5)
    expect(out.y).toBe(5)
  })

  it('normalizes diagonal movement', () => {
    const walls = borderWalls(10, 10)
    const out = stepSmoothPlayer(5, 5, 0.1, 1, 1, 4, walls, 10, 10, R)
    const dist = Math.hypot(out.x - 5, out.y - 5)
    expect(dist).toBeCloseTo(0.4, 5)
  })

  it('blocks movement into a wall but slides along it', () => {
    const walls = borderWalls(10, 10)
    walls.add(cellKey(6, 5)) // wall directly to the right
    const out = stepSmoothPlayer(5.6, 5.5, 0.1, 1, 1, 4, walls, 10, 10, R)
    expect(out.x).toBeCloseTo(5.6, 5) // x blocked
    expect(out.y).toBeGreaterThan(5.5) // y slides
  })

  it('never leaves the playable area even with huge dt', () => {
    const walls = borderWalls(10, 10)
    const out = stepSmoothPlayer(5, 5, 10, 1, 0, 100, walls, 10, 10, R)
    expect(out.x).toBeLessThan(9)
    expect(circleHitsWall(walls, 10, 10, out.x, out.y, R)).toBe(false)
  })

  it('returns the same position with zero intent', () => {
    const walls = borderWalls(10, 10)
    expect(stepSmoothPlayer(5, 5, 0.1, 0, 0, 4, walls, 10, 10, R)).toEqual({ x: 5, y: 5 })
  })
})

describe('distance helpers', () => {
  it('distSq and distSqToTileCenter agree', () => {
    expect(distSq(1, 1, 4, 5)).toBe(25)
    expect(distSqToTileCenter(3.5, 3.5, 3, 3)).toBe(0)
    expect(distSqToTileCenter(3.5, 4.5, 3, 3)).toBe(1)
  })
})

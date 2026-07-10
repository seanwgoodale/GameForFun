import { describe, expect, it } from 'vitest'
import { expandVision } from '../fogVision.js'
import { applyScoreDelta, pointsForAnswer } from '../scoring.js'
import { applyDamage, entityCenter, patchEntity } from '../world.js'
import { makeTestWorld, makeZombie } from './helpers.js'

describe('applyDamage', () => {
  it('reduces health and floors at zero', () => {
    const world = makeTestWorld()
    world.health = 30
    applyDamage(world, 10)
    expect(world.health).toBe(20)
    applyDamage(world, 50)
    expect(world.health).toBe(0)
  })

  it('ends the run with the current score on death', () => {
    const world = makeTestWorld()
    world.health = 5
    world.score = 42
    applyDamage(world, 10)
    expect(world.playing).toBe(false)
    expect(world.pendingEndScore).toBe(42)
  })

  it('ignores non-positive amounts', () => {
    const world = makeTestWorld()
    world.health = 50
    applyDamage(world, 0)
    applyDamage(world, -5)
    expect(world.health).toBe(50)
    expect(world.playing).toBe(true)
  })
})

describe('patchEntity', () => {
  it('replaces the array identity (copy-on-write for React memoization)', () => {
    const world = makeTestWorld()
    const z = makeZombie(3, 3)
    world.entities = [z]
    const before = world.entities
    patchEntity(world, z.id, { defeated: true })
    expect(world.entities).not.toBe(before)
    expect(world.entities[0].defeated).toBe(true)
    expect(z.defeated).toBeUndefined()
  })
})

describe('entityCenter', () => {
  it('uses float centers for hostiles and tile centers for the rest', () => {
    expect(entityCenter({ kind: 'zombie', x: 3.5, y: 4.5 })).toEqual({ x: 3.5, y: 4.5 })
    expect(entityCenter({ kind: 'pickup', x: 3, y: 4 })).toEqual({ x: 3.5, y: 4.5 })
    expect(entityCenter({ kind: 'radiation', x: 6, y: 2 })).toEqual({ x: 6.5, y: 2.5 })
  })
})

describe('expandVision', () => {
  it('reveals a Chebyshev square clipped to the map', () => {
    const seen = expandVision(new Set(), 1, 1, 2, 10, 10)
    expect(seen.has('0,0')).toBe(true)
    expect(seen.has('3,3')).toBe(true)
    expect(seen.has('4,1')).toBe(false)
    // 0..3 × 0..3 = 16 tiles (clipped at the map edge)
    expect(seen.size).toBe(16)
  })

  it('accumulates onto previous reveals without mutating them', () => {
    const first = expandVision(new Set(), 1, 1, 1, 10, 10)
    const second = expandVision(first, 5, 5, 1, 10, 10)
    expect(second.size).toBe(first.size + 9)
    expect(first.has('5,5')).toBe(false)
  })
})

describe('scoring', () => {
  it('awards points only for correct answers', () => {
    expect(pointsForAnswer(true)).toBeGreaterThan(0)
    expect(pointsForAnswer(false)).toBe(0)
  })

  it('never lets the score go negative', () => {
    expect(applyScoreDelta(5, -10)).toBe(0)
    expect(applyScoreDelta(5, 10)).toBe(15)
  })
})

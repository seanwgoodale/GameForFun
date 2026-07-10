import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  GLOWER_AURA_DAMAGE,
  SCREAM_CHASE_MS,
  STARTING_HEALTH,
  SUPPLY_DROP_SCORE,
} from '../../utils/constants.js'
import { updateWorld } from '../systems.js'
import { makeTestWorld, makeZombie } from './helpers.js'

const NOW = 500000
const idle = { x: 0, y: 0 }
const coldRng = () => 0.99 // never shoot, max contact roll (harmless-ish)

function distToPlayer(world, e) {
  return Math.hypot(world.player.x - e.x, world.player.y - e.y)
}

describe('difficulty presets', () => {
  it('scale monotonically from scout to nightmare', () => {
    const { scout, survivor, nightmare } = DIFFICULTIES
    expect(scout.zombies).toBeLessThan(survivor.zombies)
    expect(survivor.zombies).toBeLessThan(nightmare.zombies)
    expect(scout.healthPickups).toBeGreaterThan(nightmare.healthPickups)
    expect(scout.chaseSpeed).toBeLessThan(nightmare.chaseSpeed)
  })
})

describe('chase AI', () => {
  it('a zombie inside chase range closes on the player', () => {
    const world = makeTestWorld({ cols: 20, rows: 20 })
    const z = makeZombie(
      Math.floor(world.player.x) + 4,
      Math.floor(world.player.y),
    )
    world.entities = [z]
    const before = distToPlayer(world, world.entities[0])
    for (let i = 0; i < 30; i++) updateWorld(world, 0.05, NOW + i * 50, idle, coldRng)
    const after = distToPlayer(world, world.entities[0])
    expect(world.entities[0].chasing).toBe(true)
    expect(after).toBeLessThan(before - 1)
  })

  it('gives up beyond the reset margin', () => {
    const world = makeTestWorld({ cols: 30, rows: 20 })
    const z = makeZombie(Math.floor(world.player.x) + 4, Math.floor(world.player.y))
    world.entities = [z]
    updateWorld(world, 0.016, NOW, idle, coldRng)
    expect(world.entities[0].chasing).toBe(true)
    // Teleport the player far away — chase should drop.
    world.player = { x: world.player.x + 15, y: world.player.y }
    updateWorld(world, 0.016, NOW + 100, idle, coldRng)
    expect(world.entities[0].chasing).toBe(false)
  })

  it('runners aggro from farther than shamblers', () => {
    const base = DIFFICULTIES.survivor.chaseRange
    const gap = base + 1.5 // between shambler range and runner range

    const shamblerWorld = makeTestWorld({ cols: 30, rows: 20 })
    const s = makeZombie(Math.floor(shamblerWorld.player.x + gap), Math.floor(shamblerWorld.player.y))
    shamblerWorld.entities = [s]
    updateWorld(shamblerWorld, 0.016, NOW, idle, coldRng)
    expect(shamblerWorld.entities[0].chasing ?? false).toBe(false)

    const runnerWorld = makeTestWorld({ cols: 30, rows: 20 })
    const r = makeZombie(Math.floor(runnerWorld.player.x + gap), Math.floor(runnerWorld.player.y), { archetype: 'runner' })
    runnerWorld.entities = [r]
    updateWorld(runnerWorld, 0.016, NOW, idle, coldRng)
    expect(runnerWorld.entities[0].chasing).toBe(true)
  })
})

describe('screamer', () => {
  it('wakes zombies in earshot into a timed chase', () => {
    const world = makeTestWorld({ cols: 30, rows: 20 })
    const screamer = makeZombie(
      Math.floor(world.player.x) + 3,
      Math.floor(world.player.y),
      { archetype: 'screamer' },
    )
    // Sleeper far outside its own chase range but inside scream radius.
    const sleeper = makeZombie(
      Math.floor(world.player.x) + 9,
      Math.floor(world.player.y),
    )
    world.entities = [screamer, sleeper]
    updateWorld(world, 0.016, NOW, idle, coldRng)

    const events = world.events.map((e) => e.type)
    // scream event may already be drained into events list (not committed in tests)
    expect(events).toContain('scream')
    const wokenSleeper = world.entities.find((e) => e.id === sleeper.id)
    expect(wokenSleeper.screamWakeUntil).toBe(NOW + SCREAM_CHASE_MS)
    expect(wokenSleeper.chasing).toBe(true)
  })
})

describe('glower aura', () => {
  it('ticks damage on a cooldown when close', () => {
    const world = makeTestWorld()
    const glower = makeZombie(
      Math.floor(world.player.x),
      Math.floor(world.player.y),
      { archetype: 'glower', x: world.player.x + 0.9, y: world.player.y },
    )
    world.entities = [glower]
    world.lastZombieContact = NOW // suppress contact damage for isolation
    updateWorld(world, 0.016, NOW, idle, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - GLOWER_AURA_DAMAGE)
    // Within cooldown: no second tick.
    world.lastZombieContact = NOW + 100
    updateWorld(world, 0.016, NOW + 100, idle, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - GLOWER_AURA_DAMAGE)
    // After cooldown: ticks again.
    world.lastZombieContact = NOW + 2000
    updateWorld(world, 0.016, NOW + 2000, idle, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - GLOWER_AURA_DAMAGE * 2)
  })
})

describe('supply drop', () => {
  it('spawns, rewards the first grab, and burns out', () => {
    const world = makeTestWorld({ cols: 40, rows: 40 })
    world.supplyDrop = { state: 'pending', spawnAt: NOW }
    // rng drives placement: 0.5 → center-ish tile, comfortably 12+ tiles away
    world.player = { x: 2.5, y: 2.5 }
    updateWorld(world, 0.016, NOW, idle, () => 0.5)
    expect(world.supplyDrop.state).toBe('active')
    const dropItems = world.entities.filter((e) => e.id.startsWith('drop-'))
    expect(dropItems).toHaveLength(5)

    // Player walks onto the cache.
    world.player = { x: world.supplyDrop.x + 0.5, y: world.supplyDrop.y + 0.5 }
    updateWorld(world, 0.016, NOW + 1000, idle, () => 0.99)
    expect(world.score).toBe(SUPPLY_DROP_SCORE)
    expect(world.healthPacks + world.weapons).toBeGreaterThan(0)
    expect(world.supplyDrop.rewarded).toBe(true)
    expect(world.supplyDrop.state).toBe('done') // all items grabbed at once
  })

  it('expires uncollected items', () => {
    const world = makeTestWorld({ cols: 40, rows: 40 })
    world.player = { x: 2.5, y: 2.5 }
    world.supplyDrop = { state: 'pending', spawnAt: NOW }
    updateWorld(world, 0.016, NOW, idle, () => 0.5)
    const expiresAt = world.supplyDrop.expiresAt
    updateWorld(world, 0.016, expiresAt + 1, idle, () => 0.99)
    expect(world.supplyDrop.state).toBe('done')
    expect(
      world.entities.filter((e) => e.id.startsWith('drop-') && !e.defeated),
    ).toHaveLength(0)
    expect(world.score).toBe(0)
  })
})

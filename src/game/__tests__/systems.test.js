import { describe, expect, it } from 'vitest'
import {
  GOAL_BONUS,
  HEALTH_PICKUP_AMOUNT,
  HOSTILE_PROJECTILE_FLIGHT_MS,
  MAX_HEALTH,
  RADIATION_DAMAGE,
  STARTING_HEALTH,
  ZOMBIES_TO_ELIMINATE,
} from '../../utils/constants.js'
import { updateWorld } from '../systems.js'
import { makeTestWorld, makeTrader, makeZombie } from './helpers.js'

const NOW = 100000
const noIntent = { x: 0, y: 0 }
/** rng that never triggers probabilistic branches (no shots, min contact dmg) */
const coldRng = () => 0.99

describe('updateWorld gating', () => {
  it('does nothing when not playing', () => {
    const world = makeTestWorld()
    world.playing = false
    const before = { ...world.player }
    updateWorld(world, 0.016, NOW, { x: 1, y: 0 }, coldRng)
    expect(world.player).toEqual(before)
  })

  it('pauses the sim during encounters but still lands in-flight shots', () => {
    const world = makeTestWorld()
    world.encounterId = 'someone'
    world.pendingEffects = [
      { at: NOW - 1, type: 'hostile-shot-damage', amount: 10 },
    ]
    updateWorld(world, 0.016, NOW, { x: 1, y: 0 }, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - 10)
    expect(world.pendingEffects).toHaveLength(0)
    // player did not move despite intent
    expect(world.player.x).toBeCloseTo(makeTestWorld().player.x)
  })
})

describe('hostile AI', () => {
  it('an aggroed zombie that decides to shoot schedules damage', () => {
    const world = makeTestWorld()
    const z = makeZombie(
      Math.floor(world.player.x) + 2,
      Math.floor(world.player.y),
    )
    world.entities = [z]
    // rng: below shot chance => shoot; keep contact damage rolls harmless
    updateWorld(world, 0.016, NOW, noIntent, () => 0.01)
    expect(world.hostileProjectile).not.toBeNull()
    expect(world.pendingEffects.some((fx) => fx.type === 'hostile-shot-damage')).toBe(true)

    // shot lands after flight time
    updateWorld(world, 0.016, NOW + HOSTILE_PROJECTILE_FLIGHT_MS + 1, noIntent, () => 0.99)
    expect(world.health).toBeLessThan(STARTING_HEALTH)
    expect(world.hostileProjectile).toBeNull()
  })

  it('a zombie that declines to engage never shoots', () => {
    const world = makeTestWorld()
    const z = makeZombie(
      Math.floor(world.player.x) + 2,
      Math.floor(world.player.y),
    )
    world.entities = [z]
    updateWorld(world, 0.016, NOW, noIntent, () => 0.99) // above shot chance
    expect(world.hostileApproach.get(z.id)).toBe('no-engage')
    updateWorld(world, 0.016, NOW + 5000, noIntent, () => 0.99)
    expect(world.pendingEffects).toHaveLength(0)
    expect(world.health).toBe(STARTING_HEALTH)
  })
})

describe('encounters and contact', () => {
  it('touching an engager zombie opens an encounter', () => {
    const world = makeTestWorld()
    const z = makeZombie(2, 2)
    world.entities = [z]
    world.player = { x: z.x - 0.2, y: z.y }
    world.hostileApproach.set(z.id, { lastShotTime: NOW, nextShotDelay: 1e9 })
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.encounterId).toBe(z.id)
  })

  it('no-engage zombies do not open encounters but do contact damage', () => {
    const world = makeTestWorld()
    const z = makeZombie(2, 2)
    world.entities = [z]
    world.player = { x: z.x - 0.2, y: z.y }
    world.hostileApproach.set(z.id, 'no-engage')
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.encounterId).toBeNull()
    expect(world.health).toBeLessThan(STARTING_HEALTH)
  })

  it('traded and angry traders are pass-through', () => {
    const world = makeTestWorld()
    const traded = makeTrader(2, 2, { traded: true })
    world.entities = [traded]
    world.player = { x: traded.x - 0.2, y: traded.y }
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.encounterId).toBeNull()

    const angry = makeTrader(4, 4, { angryUntil: NOW + 60000 })
    world.entities = [angry]
    world.player = { x: angry.x - 0.2, y: angry.y }
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.encounterId).toBeNull()
  })
})

describe('radiation', () => {
  it('damages once per hotspot per run', () => {
    const world = makeTestWorld()
    const px = Math.floor(world.player.x)
    const py = Math.floor(world.player.y)
    world.entities = [
      { id: 'r1', kind: 'radiation', x: px, y: py, pulseGrowMs: 1, pulseShrinkMs: 1e9, pulseRestMs: 1, pulseOffsetMs: 0 },
    ]
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - RADIATION_DAMAGE)
    updateWorld(world, 0.016, NOW + 100, noIntent, coldRng)
    expect(world.health).toBe(STARTING_HEALTH - RADIATION_DAMAGE)
  })
})

describe('pickups and healing', () => {
  it('banks medkits when healthy, auto-uses when hurt', () => {
    const world = makeTestWorld()
    const px = Math.floor(world.player.x)
    const py = Math.floor(world.player.y)
    world.entities = [{ id: 'p1', kind: 'pickup', pickupType: 'health', x: px, y: py }]
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.healthPacks).toBe(1)
    expect(world.health).toBe(STARTING_HEALTH)

    const hurt = makeTestWorld()
    hurt.health = 20
    hurt.entities = [{ id: 'p2', kind: 'pickup', pickupType: 'health', x: Math.floor(hurt.player.x), y: Math.floor(hurt.player.y) }]
    updateWorld(hurt, 0.016, NOW, noIntent, coldRng)
    expect(hurt.health).toBe(20 + HEALTH_PICKUP_AMOUNT)
    expect(hurt.healthPacks).toBe(0)
  })

  it('collects weapon pickups as ammo', () => {
    const world = makeTestWorld()
    world.entities = [
      { id: 'w1', kind: 'pickup', pickupType: 'weapon', x: Math.floor(world.player.x), y: Math.floor(world.player.y) },
    ]
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.weapons).toBe(1)
    expect(world.entities[0].defeated).toBe(true)
  })

  it('house tiles heal over time up to the cap', () => {
    const world = makeTestWorld()
    world.health = MAX_HEALTH - 1
    world.entities = [
      { id: 'h1', kind: 'house', x: Math.floor(world.player.x), y: Math.floor(world.player.y) },
    ]
    updateWorld(world, 0.05, NOW, noIntent, coldRng)
    expect(world.health).toBeGreaterThan(MAX_HEALTH - 1)
    for (let i = 0; i < 100; i++) updateWorld(world, 0.05, NOW + i, noIntent, coldRng)
    expect(world.health).toBe(MAX_HEALTH)
  })
})

describe('extraction', () => {
  function atExit() {
    const world = makeTestWorld()
    world.player = { x: world.exitCell.x + 0.5, y: world.exitCell.y + 0.5 }
    return world
  }

  it('blocks extraction until the zombie quota is met', () => {
    const world = atExit()
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.exitBlocked).toBe(true)
    expect(world.playing).toBe(true)
  })

  it('awards the goal bonus and ends the run once the quota is met', () => {
    const world = atExit()
    world.zombiesKilled = ZOMBIES_TO_ELIMINATE
    world.score = 100
    updateWorld(world, 0.016, NOW, noIntent, coldRng)
    expect(world.playing).toBe(false)
    expect(world.pendingEndScore).toBe(100 + GOAL_BONUS)
  })
})

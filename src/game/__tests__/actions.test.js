import { describe, expect, it } from 'vitest'
import { scenarios } from '../../data/scenarios.js'
import {
  POINTS_PER_CORRECT,
  STARTING_HEALTH,
  TRADER_AMMO_REWARD,
  TRADER_HEALTH_PACK_REWARD,
  WEAPON_KILL_SCORE,
  WEAPON_MISS_DAMAGE,
  WRONG_ANSWER_DAMAGE,
} from '../../utils/constants.js'
import { cellKey } from '../../utils/helpers.js'
import {
  fireRangedWeapon,
  pickTraderReward,
  submitEncounterAnswer,
  tryWeaponOnEncounter,
  useHealthPack,
} from '../actions.js'
import { updateWorld } from '../systems.js'
import { makeTestWorld, makeTrader, makeZombie } from './helpers.js'

const scenarioFor = (id) => scenarios.find((s) => s.id === id)

function worldWithEncounter(makeEntity) {
  const world = makeTestWorld()
  const entity = makeEntity(3, 3)
  world.entities = [entity]
  world.encounterId = entity.id
  return { world, entity, scenario: scenarioFor(entity.scenarioId) }
}

describe('submitEncounterAnswer', () => {
  it('correct answer defeats a zombie, scores, and closes the modal', () => {
    const { world, entity, scenario } = worldWithEncounter(makeZombie)
    submitEncounterAnswer(world, scenario.correctIndex)
    expect(world.entities[0].defeated).toBe(true)
    expect(world.zombiesKilled).toBe(1)
    expect(world.score).toBe(POINTS_PER_CORRECT)
    expect(world.encounterId).toBeNull()
    expect(entity.id).toBe(world.entities[0].id)
  })

  it('correct answer moves a trader to the reward step, still open', () => {
    const { world, scenario } = worldWithEncounter(makeTrader)
    submitEncounterAnswer(world, scenario.correctIndex)
    expect(world.encounterStep).toBe('reward')
    expect(world.encounterId).not.toBeNull()
    expect(world.entities[0].defeated).toBeUndefined()
  })

  it('wrong answer damages the player and keeps the encounter open', () => {
    const { world, scenario } = worldWithEncounter(makeZombie)
    const wrong = (scenario.correctIndex + 1) % scenario.options.length
    submitEncounterAnswer(world, wrong)
    expect(world.health).toBe(STARTING_HEALTH - WRONG_ANSWER_DAMAGE)
    expect(world.encounterId).not.toBeNull()
    expect(world.entities[0].defeated).toBeUndefined()
  })

  it('a fatal wrong answer ends the run', () => {
    const { world, scenario } = worldWithEncounter(makeZombie)
    world.health = WRONG_ANSWER_DAMAGE
    world.score = 7
    submitEncounterAnswer(world, (scenario.correctIndex + 1) % scenario.options.length)
    expect(world.playing).toBe(false)
    expect(world.pendingEndScore).toBe(7)
  })
})

describe('pickTraderReward', () => {
  it.each([
    ['ammo', (w) => w.weapons, TRADER_AMMO_REWARD],
    ['health', (w) => w.healthPacks, TRADER_HEALTH_PACK_REWARD],
  ])('grants %s and marks the trader traded', (choice, read, amount) => {
    const { world } = worldWithEncounter(makeTrader)
    world.encounterStep = 'reward'
    const before = read(world)
    pickTraderReward(world, choice)
    expect(read(world)).toBe(before + amount)
    expect(world.entities[0].traded).toBe(true)
    expect(world.encounterId).toBeNull()
    expect(world.encounterStep).toBe('question')
  })
})

describe('tryWeaponOnEncounter', () => {
  it('hit kills a zombie and scores', () => {
    const { world } = worldWithEncounter(makeZombie)
    world.weapons = 2
    tryWeaponOnEncounter(world, () => 0) // always under kill chance
    expect(world.weapons).toBe(1)
    expect(world.entities[0].defeated).toBe(true)
    expect(world.score).toBe(WEAPON_KILL_SCORE)
    expect(world.encounterId).toBeNull()
  })

  it('hit on a trader angers instead of killing', () => {
    const { world } = worldWithEncounter(makeTrader)
    world.weapons = 1
    tryWeaponOnEncounter(world, () => 0)
    expect(world.entities[0].defeated).toBeUndefined()
    expect(world.entities[0].angryUntil).toBeGreaterThan(Date.now())
    expect(world.encounterId).toBeNull()
  })

  it('miss costs vitals and leaves the encounter open', () => {
    const { world } = worldWithEncounter(makeZombie)
    world.weapons = 1
    tryWeaponOnEncounter(world, () => 0.99) // always over kill chance
    expect(world.weapons).toBe(0)
    expect(world.health).toBe(STARTING_HEALTH - WEAPON_MISS_DAMAGE)
    expect(world.weaponFeedback).toBe('miss')
    expect(world.encounterId).not.toBeNull()
  })

  it('does nothing without charges', () => {
    const { world } = worldWithEncounter(makeZombie)
    world.weapons = 0
    tryWeaponOnEncounter(world, () => 0)
    expect(world.entities[0].defeated).toBeUndefined()
  })
})

describe('fireRangedWeapon', () => {
  function rangedSetup() {
    const world = makeTestWorld()
    world.weapons = 3
    world.player = { x: 3.5, y: 3.5 }
    world.lastMoveDir = { x: 1, y: 0 }
    return world
  }

  it('defeats a zombie in line after the flight time', () => {
    const world = rangedSetup()
    const z = makeZombie(5, 3)
    world.entities = [z]
    const now = 1000
    fireRangedWeapon(world, now)
    expect(world.weapons).toBe(2)
    expect(world.projectile).not.toBeNull()
    expect(world.entities[0].defeated).toBeUndefined() // not yet landed

    updateWorld(world, 0.016, now + 1000, { x: 0, y: 0 }, () => 0.99)
    expect(world.entities[0].defeated).toBe(true)
    expect(world.zombiesKilled).toBe(1)
    expect(world.score).toBe(WEAPON_KILL_SCORE)
    expect(world.projectile).toBeNull()
  })

  it('is blocked by walls', () => {
    const world = rangedSetup()
    world.wallSet.add(cellKey(4, 3))
    world.entities = [makeZombie(5, 3)]
    fireRangedWeapon(world, 1000)
    expect(world.pendingEffects).toHaveLength(0)
  })

  it('angers a trader instead of killing', () => {
    const world = rangedSetup()
    world.entities = [makeTrader(5, 3)]
    fireRangedWeapon(world, 1000)
    updateWorld(world, 0.016, 2000, { x: 0, y: 0 }, () => 0.99)
    expect(world.entities[0].defeated).toBeUndefined()
    expect(world.entities[0].angryUntil).toBeGreaterThan(2000)
  })

  it('no-ops while an encounter is open or without ammo', () => {
    const world = rangedSetup()
    world.encounterId = 'anything'
    fireRangedWeapon(world, 1000)
    expect(world.weapons).toBe(3)
    world.encounterId = null
    world.weapons = 0
    fireRangedWeapon(world, 1000)
    expect(world.projectile).toBeNull()
  })
})

describe('useHealthPack', () => {
  it('heals and consumes a pack', () => {
    const world = makeTestWorld()
    world.health = 40
    world.healthPacks = 2
    useHealthPack(world)
    expect(world.healthPacks).toBe(1)
    expect(world.health).toBeGreaterThan(40)
  })

  it('does nothing without packs', () => {
    const world = makeTestWorld()
    world.health = 40
    useHealthPack(world)
    expect(world.health).toBe(40)
  })
})

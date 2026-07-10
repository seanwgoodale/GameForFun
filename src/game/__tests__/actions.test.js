import { describe, expect, it } from 'vitest'
import { encounters, getEncounterById } from '../../data/encounters.js'
import {
  ENCOUNTER_PACIFIED_MS,
  STARTING_HEALTH,
  WEAPON_KILL_SCORE,
} from '../../utils/constants.js'
import { cellKey } from '../../utils/helpers.js'
import {
  canAfford,
  dismissEncounterResult,
  fireRangedWeapon,
  resolveEncounterChoice,
  rollOutcome,
  useHealthPack,
} from '../actions.js'
import { updateWorld } from '../systems.js'
import { makeTestWorld, makeTrader, makeZombie, seqRng } from './helpers.js'

function worldWithEncounter(makeEntity, scenarioId) {
  const world = makeTestWorld()
  const entity = makeEntity(3, 3, scenarioId ? { scenarioId } : {})
  world.entities = [entity]
  world.encounterId = entity.id
  world.encounterStep = 'choice'
  return { world, entity, encounter: getEncounterById(entity.scenarioId) }
}

/** Find (choiceIndex, rng-value) that lands on an outcome matching `pred`. */
function findChoiceOutcome(encounter, pred) {
  for (let ci = 0; ci < encounter.choices.length; ci++) {
    const outcomes = encounter.choices[ci].outcomes
    const total = outcomes.reduce((s, o) => s + o.chance, 0)
    let acc = 0
    for (const o of outcomes) {
      const mid = (acc + o.chance / 2) / total
      if (pred(o)) return { ci, r: mid, outcome: o }
      acc += o.chance
    }
  }
  return null
}

describe('encounter data integrity', () => {
  it('every encounter has 2+ choices and valid outcome weights', () => {
    for (const enc of encounters) {
      expect(enc.choices.length, enc.id).toBeGreaterThanOrEqual(2)
      for (const c of enc.choices) {
        expect(c.outcomes.length, `${enc.id}/${c.label}`).toBeGreaterThan(0)
        for (const o of c.outcomes) {
          expect(o.chance, `${enc.id}/${c.label}`).toBeGreaterThan(0)
          expect(o.text.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every hostile encounter offers at least one possible kill', () => {
    for (const enc of encounters.filter((e) => e.kind === 'zombie')) {
      const anyKill = enc.choices.some((c) => c.outcomes.some((o) => o.effects?.kill))
      expect(anyKill, enc.id).toBe(true)
    }
  })

  it('every trader encounter offers at least one possible trade', () => {
    for (const enc of encounters.filter((e) => e.kind === 'trader')) {
      const anyTrade = enc.choices.some((c) => c.outcomes.some((o) => o.effects?.trade))
      expect(anyTrade, enc.id).toBe(true)
    }
  })
})

describe('rollOutcome', () => {
  it('respects weights deterministically', () => {
    const outcomes = [
      { chance: 0.25, text: 'a' },
      { chance: 0.75, text: 'b' },
    ]
    expect(rollOutcome(outcomes, () => 0.1).text).toBe('a')
    expect(rollOutcome(outcomes, () => 0.5).text).toBe('b')
    expect(rollOutcome(outcomes, () => 0.999).text).toBe('b')
  })
})

describe('resolveEncounterChoice', () => {
  it('a kill outcome defeats the hostile, counts the quota, and moves to result', () => {
    const { world, entity, encounter } = worldWithEncounter(makeZombie, 'z-lunge')
    world.weapons = 3
    const found = findChoiceOutcome(encounter, (o) => o.effects?.kill && !o.effects?.health)
    resolveEncounterChoice(world, found.ci, seqRng([found.r]))
    expect(world.entities[0].defeated).toBe(true)
    expect(world.zombiesKilled).toBe(1)
    expect(world.encounterStep).toBe('result')
    expect(world.encounterResult.text).toBe(found.outcome.text)
    expect(world.score).toBe(found.outcome.effects.score ?? 0)
    expect(entity.defeated).toBeUndefined() // copy-on-write
  })

  it('pays ammo costs up front and refuses unaffordable choices', () => {
    const { world, encounter } = worldWithEncounter(makeZombie, 'z-lunge')
    const costly = encounter.choices.findIndex((c) => c.cost?.ammo)
    expect(canAfford(world, encounter.choices[costly])).toBe(false)
    resolveEncounterChoice(world, costly, seqRng([0]))
    expect(world.encounterStep).toBe('choice') // refused, still choosing

    world.weapons = 2
    resolveEncounterChoice(world, costly, seqRng([0]))
    expect(world.weapons).toBeLessThan(2) // cost deducted (outcome may refund differently)
    expect(world.encounterStep).toBe('result')
  })

  it('damage outcomes run the death pipeline', () => {
    const { world, encounter } = worldWithEncounter(makeZombie, 'z-lunge')
    world.weapons = 5
    const found = findChoiceOutcome(encounter, (o) => (o.effects?.health ?? 0) < 0)
    world.health = 1
    world.score = 33
    resolveEncounterChoice(world, found.ci, seqRng([found.r]))
    expect(world.health).toBe(0)
    expect(world.playing).toBe(false)
    expect(world.pendingEndScore).toBeGreaterThanOrEqual(33)
  })

  it('a trade outcome marks the trader and grants rewards', () => {
    const { world, encounter } = worldWithEncounter(makeTrader, 't-caravan')
    const found = findChoiceOutcome(encounter, (o) => o.effects?.trade && o.effects?.ammo)
    resolveEncounterChoice(world, found.ci, seqRng([found.r]))
    expect(world.entities[0].traded).toBe(true)
    expect(world.weapons).toBe(found.outcome.effects.ammo)
    expect(world.encounterStep).toBe('result')
  })
})

describe('dismissEncounterResult', () => {
  it('pacifies a surviving hostile so it does not instantly re-trigger', () => {
    const { world } = worldWithEncounter(makeZombie, 'z-lunge')
    const encounter = getEncounterById('z-lunge')
    const flee = findChoiceOutcome(encounter, (o) => !o.effects?.kill && !(o.effects?.health < 0))
    resolveEncounterChoice(world, flee.ci, seqRng([flee.r]))
    expect(world.encounterStep).toBe('result')

    const now = Date.now()
    dismissEncounterResult(world, now)
    expect(world.encounterId).toBeNull()
    expect(world.entities[0].pacifiedUntil).toBe(now + ENCOUNTER_PACIFIED_MS)

    // Standing on the hostile does NOT reopen while pacified…
    world.player = { x: world.entities[0].x - 0.2, y: world.entities[0].y }
    world.hostileApproach.set(world.entities[0].id, { lastShotTime: now, nextShotDelay: 1e9 })
    updateWorld(world, 0.016, now + 1000, { x: 0, y: 0 }, () => 0.99)
    expect(world.encounterId).toBeNull()
    // …but does once the window lapses.
    updateWorld(world, 0.016, now + ENCOUNTER_PACIFIED_MS + 1, { x: 0, y: 0 }, () => 0.99)
    expect(world.encounterId).toBe(world.entities[0].id)
  })

  it('does not pacify defeated or traded entities', () => {
    const { world } = worldWithEncounter(makeTrader, 't-caravan')
    const encounter = getEncounterById('t-caravan')
    const trade = findChoiceOutcome(encounter, (o) => o.effects?.trade)
    resolveEncounterChoice(world, trade.ci, seqRng([trade.r]))
    dismissEncounterResult(world, 1000)
    expect(world.entities[0].pacifiedUntil).toBeUndefined()
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

describe('resolveEncounterChoice guards', () => {
  it('ignores calls when not in choice step or not playing', () => {
    const { world } = worldWithEncounter(makeZombie, 'z-lunge')
    world.encounterStep = 'result'
    resolveEncounterChoice(world, 0, seqRng([0]))
    expect(world.encounterResult).toBeNull()

    world.encounterStep = 'choice'
    world.playing = false
    resolveEncounterChoice(world, 0, seqRng([0]))
    expect(world.encounterResult).toBeNull()
  })

  it('health of exactly starting value is unchanged by pure-flavor outcomes', () => {
    const { world, encounter } = worldWithEncounter(makeZombie, 'z-lunge')
    const flee = findChoiceOutcome(
      encounter,
      (o) => !o.effects || Object.keys(o.effects).length === 0,
    )
    resolveEncounterChoice(world, flee.ci, seqRng([flee.r]))
    expect(world.health).toBe(STARTING_HEALTH)
  })
})

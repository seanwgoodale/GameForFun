import { describe, expect, it } from 'vitest'
import {
  chainedEncounters,
  encounters,
  getEncounterById,
  hostileEncounterIds,
  traderEncounterIds,
} from '../../data/encounters.js'
import { resolveEncounterChoice } from '../actions.js'
import { chooseEncounterId } from '../systems.js'
import { makeTestWorld, makeTrader, makeZombie, seqRng } from './helpers.js'

describe('encounter deck shape', () => {
  it('has a healthy deck with gated payoffs excluded from base pools', () => {
    expect(encounters.length).toBeGreaterThanOrEqual(45)
    expect(chainedEncounters.length).toBeGreaterThanOrEqual(4)
    for (const enc of chainedEncounters) {
      expect(hostileEncounterIds).not.toContain(enc.id)
      expect(traderEncounterIds).not.toContain(enc.id)
    }
  })

  it('every flag set somewhere has a payoff encounter, and vice versa', () => {
    const setFlags = new Set()
    for (const enc of encounters)
      for (const c of enc.choices)
        for (const o of c.outcomes)
          if (o.effects?.flag) setFlags.add(o.effects.flag)
    const requiredFlags = new Set(chainedEncounters.map((e) => e.requiresFlag))
    expect([...requiredFlags].sort()).toEqual([...setFlags].sort())
  })
})

describe('chooseEncounterId', () => {
  it('prefers an unlocked payoff over the assigned encounter', () => {
    const world = makeTestWorld()
    const trader = makeTrader(3, 3) // assigned t-caravan
    world.flags.add('pilgrim-blessed')
    const chosen = chooseEncounterId(world, trader, () => 0)
    const enc = getEncounterById(chosen)
    expect(enc.requiresFlag).toBe('pilgrim-blessed')
  })

  it('never repeats a seen encounter while fresh ones remain', () => {
    const world = makeTestWorld()
    const z = makeZombie(3, 3) // assigned z-lunge
    world.seenEncounters.add('z-lunge')
    const chosen = chooseEncounterId(world, z, () => 0)
    expect(chosen).not.toBe('z-lunge')
    expect(hostileEncounterIds).toContain(chosen)
  })

  it('does not surface payoffs before their flag is set or after seen', () => {
    const world = makeTestWorld()
    const trader = makeTrader(3, 3)
    expect(getEncounterById(chooseEncounterId(world, trader, () => 0)).requiresFlag).toBeUndefined()

    world.flags.add('pilgrim-blessed')
    world.seenEncounters.add('t-pilgrim-return')
    const chosen = chooseEncounterId(world, trader, () => 0)
    expect(chosen).not.toBe('t-pilgrim-return')
  })
})

describe('flag setting through resolution', () => {
  it('an outcome with a flag adds it to world.flags', () => {
    const world = makeTestWorld()
    const trader = makeTrader(3, 3, { scenarioId: 't-pilgrim' })
    world.entities = [trader]
    world.encounterId = trader.id
    world.encounterStep = 'choice'
    const enc = getEncounterById('t-pilgrim')
    // First choice, first outcome carries the pilgrim-blessed flag.
    const ci = enc.choices.findIndex((c) =>
      c.outcomes.some((o) => o.effects?.flag === 'pilgrim-blessed'),
    )
    resolveEncounterChoice(world, ci, seqRng([0]))
    expect(world.flags.has('pilgrim-blessed')).toBe(true)
  })
})

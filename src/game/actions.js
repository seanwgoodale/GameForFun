import { getEncounterById } from '../data/encounters.js'
import {
  ENCOUNTER_PACIFIED_MS,
  HEALTH_PICKUP_AMOUNT,
  MAX_HEALTH,
  PROJECTILE_FLIGHT_MS,
  RANGED_SHOT_RANGE,
  TRADER_ANGRY_DURATION_MS,
  WEAPON_KILL_SCORE,
} from '../utils/constants.js'
import { cellKey } from '../utils/helpers.js'
import { applyScoreDelta } from './scoring.js'
import { applyDamage, patchEntity, pushEvent, touch } from './world.js'

/** @param {import('./world.js').World} world */
function currentEncounter(world) {
  if (!world.encounterId) return null
  return world.entities.find((e) => e.id === world.encounterId) ?? null
}

/**
 * Weighted outcome roll; chances are weights and need not sum to 1.
 * @param {import('../data/encounters.js').Outcome[]} outcomes
 * @param {() => number} rng
 */
export function rollOutcome(outcomes, rng) {
  const total = outcomes.reduce((sum, o) => sum + o.chance, 0)
  let r = rng() * total
  for (const o of outcomes) {
    r -= o.chance
    if (r < 0) return o
  }
  return outcomes[outcomes.length - 1]
}

/**
 * Whether a choice's up-front cost is payable right now.
 * @param {import('./world.js').World} world
 * @param {import('../data/encounters.js').Choice} choice
 */
export function canAfford(world, choice) {
  return (
    world.weapons >= (choice.cost?.ammo ?? 0) &&
    world.healthPacks >= (choice.cost?.medkits ?? 0)
  )
}

/**
 * Resolve one encounter choice: pay costs, roll the outcome, apply effects,
 * and move to the result step. Health loss runs the shared damage pipeline,
 * so a bad outcome can end the run.
 * @param {import('./world.js').World} world
 * @param {number} choiceIndex
 * @param {() => number} [rng]
 * @param {number} [now]
 */
export function resolveEncounterChoice(
  world,
  choiceIndex,
  rng = Math.random,
  now = Date.now(),
) {
  const entity = currentEncounter(world)
  const encounter = entity?.scenarioId
    ? getEncounterById(entity.scenarioId)
    : null
  if (!entity || !encounter || !world.playing) return
  if (world.encounterStep !== 'choice') return
  const choice = encounter.choices[choiceIndex]
  if (!choice || !canAfford(world, choice)) return

  world.weapons -= choice.cost?.ammo ?? 0
  world.healthPacks -= choice.cost?.medkits ?? 0

  const outcome = rollOutcome(choice.outcomes, rng)
  const fx = outcome.effects ?? {}

  if (fx.ammo) world.weapons = Math.max(0, world.weapons + fx.ammo)
  if (fx.medkits) world.healthPacks = Math.max(0, world.healthPacks + fx.medkits)
  if (fx.score) world.score = applyScoreDelta(world.score, fx.score)
  if (fx.health) {
    if (fx.health < 0) applyDamage(world, -fx.health)
    else world.health = Math.min(MAX_HEALTH, world.health + fx.health)
  }
  if (fx.kill) {
    if (entity.kind === 'zombie') world.zombiesKilled += 1
    patchEntity(world, entity.id, { defeated: true })
    pushEvent(world, { type: 'kill', x: entity.x, y: entity.y })
  }
  if (fx.trade) {
    patchEntity(world, entity.id, { traded: true })
    pushEvent(world, { type: 'trade' })
  }
  if (fx.anger) {
    patchEntity(world, entity.id, {
      angryUntil: now + TRADER_ANGRY_DURATION_MS,
    })
    pushEvent(world, { type: 'anger', x: entity.x, y: entity.y })
  }
  if (fx.flag) world.flags.add(fx.flag)

  world.encounterResult = { text: outcome.text, effects: fx }
  world.encounterStep = 'result'
  touch(world)
}

/**
 * Leave the result screen. A survivor that wasn't killed or traded gets a
 * short pacified window so the player can disengage without instantly
 * re-triggering the same encounter.
 * @param {import('./world.js').World} world
 * @param {number} [now]
 */
export function dismissEncounterResult(world, now = Date.now()) {
  if (world.encounterStep !== 'result') return
  const entity = currentEncounter(world)
  if (entity && !entity.defeated && !entity.traded) {
    patchEntity(world, entity.id, {
      pacifiedUntil: now + ENCOUNTER_PACIFIED_MS,
    })
  }
  world.encounterId = null
  world.encounterStep = 'choice'
  world.encounterResult = null
  touch(world)
}

/**
 * Space-bar ranged shot: raycast tiles along the last move direction; a hit
 * lands when the projectile visual arrives (world-time pending effect).
 * @param {import('./world.js').World} world
 * @param {number} now Date.now()
 */
export function fireRangedWeapon(world, now) {
  if (!world.playing || world.encounterId) return
  if (world.weapons <= 0) {
    pushEvent(world, { type: 'dry-fire' })
    return
  }

  let { x: dx, y: dy } = world.lastMoveDir
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) {
    dx = 0
    dy = 1
  } else {
    dx /= len
    dy /= len
  }

  world.projectile = {
    dx,
    dy,
    // Renderer-only: tracer origin + timing.
    ox: world.player.x,
    oy: world.player.y,
    startAt: now,
    expiresAt: now + PROJECTILE_FLIGHT_MS,
  }
  world.weapons -= 1
  pushEvent(world, { type: 'player-shot', x: world.player.x, y: world.player.y, dx, dy })
  touch(world)

  const { x: px, y: py } = world.player
  for (let i = 1; i <= RANGED_SHOT_RANGE; i++) {
    const tx = Math.floor(px + dx * i)
    const ty = Math.floor(py + dy * i)
    if (tx < 0 || tx >= world.cols || ty < 0 || ty >= world.rows) break
    if (world.wallSet.has(cellKey(tx, ty))) break
    const hostile = world.entities.find(
      (e) =>
        !e.defeated &&
        (e.kind === 'zombie' || e.kind === 'trader') &&
        Math.floor(e.x) === tx &&
        Math.floor(e.y) === ty,
    )
    if (hostile) {
      world.pendingEffects.push({
        at: now + PROJECTILE_FLIGHT_MS,
        type: 'ranged-hit',
        targetId: hostile.id,
        targetKind: hostile.kind,
        score: WEAPON_KILL_SCORE,
        angryMs: TRADER_ANGRY_DURATION_MS,
      })
      break
    }
  }
}

/** @param {import('./world.js').World} world */
export function useHealthPack(world) {
  if (!world.playing || world.healthPacks <= 0) return
  world.healthPacks -= 1
  world.health = Math.min(MAX_HEALTH, world.health + HEALTH_PICKUP_AMOUNT)
  pushEvent(world, { type: 'heal', x: world.player.x, y: world.player.y })
  touch(world)
}

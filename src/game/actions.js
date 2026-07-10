import { getScenarioById } from '../data/scenarios.js'
import {
  HEALTH_PICKUP_AMOUNT,
  MAX_HEALTH,
  PROJECTILE_FLIGHT_MS,
  RANGED_SHOT_RANGE,
  TRADER_AMMO_REWARD,
  TRADER_ANGRY_DURATION_MS,
  TRADER_HEALTH_PACK_REWARD,
  WEAPON_KILL_CHANCE,
  WEAPON_KILL_SCORE,
  WEAPON_MISS_DAMAGE,
  WRONG_ANSWER_DAMAGE,
} from '../utils/constants.js'
import { cellKey } from '../utils/helpers.js'
import { applyScoreDelta, pointsForAnswer } from './scoring.js'
import { applyDamage, patchEntity, touch } from './world.js'

/** @param {import('./world.js').World} world */
function currentEncounter(world) {
  if (!world.encounterId) return null
  return world.entities.find((e) => e.id === world.encounterId) ?? null
}

function closeEncounter(world) {
  world.encounterId = null
  world.encounterStep = 'question'
  touch(world)
}

/**
 * Answer the open encounter. Correct: score, and zombies die (traders move to
 * the reward step). Wrong: vitals damage, encounter stays open.
 * @param {import('./world.js').World} world
 * @param {number} optionIndex
 */
export function submitEncounterAnswer(world, optionIndex) {
  const entity = currentEncounter(world)
  const scenario = entity?.scenarioId
    ? getScenarioById(entity.scenarioId)
    : null
  if (!entity || !scenario || !world.playing) return

  world.weaponFeedback = null
  touch(world)
  if (optionIndex === scenario.correctIndex) {
    world.score = applyScoreDelta(world.score, pointsForAnswer(true))
    if (entity.kind === 'trader') {
      world.encounterStep = 'reward'
      return
    }
    world.zombiesKilled += 1
    patchEntity(world, entity.id, { defeated: true })
    closeEncounter(world)
    return
  }
  applyDamage(world, WRONG_ANSWER_DAMAGE)
}

/**
 * @param {import('./world.js').World} world
 * @param {'ammo' | 'health'} choice
 */
export function pickTraderReward(world, choice) {
  const entity = currentEncounter(world)
  if (!entity || entity.kind !== 'trader' || !world.playing) return
  if (choice === 'ammo') world.weapons += TRADER_AMMO_REWARD
  else if (choice === 'health') world.healthPacks += TRADER_HEALTH_PACK_REWARD
  patchEntity(world, entity.id, { traded: true })
  closeEncounter(world)
}

/**
 * Spend a sidearm charge inside the encounter modal. Hits kill zombies or anger
 * traders; misses cost vitals and leave the encounter open.
 * @param {import('./world.js').World} world
 * @param {() => number} [rng]
 */
export function tryWeaponOnEncounter(world, rng = Math.random) {
  const entity = currentEncounter(world)
  if (!entity || !world.playing || world.weapons <= 0) return

  world.weaponFeedback = null
  world.weapons -= 1
  touch(world)
  const hit = rng() < WEAPON_KILL_CHANCE
  if (hit && entity.kind === 'zombie') {
    world.zombiesKilled += 1
    world.score = applyScoreDelta(world.score, WEAPON_KILL_SCORE)
    patchEntity(world, entity.id, { defeated: true })
    closeEncounter(world)
  } else if (hit && entity.kind === 'trader') {
    patchEntity(world, entity.id, {
      angryUntil: Date.now() + TRADER_ANGRY_DURATION_MS,
    })
    closeEncounter(world)
  } else {
    world.weaponFeedback = 'miss'
    applyDamage(world, WEAPON_MISS_DAMAGE)
  }
}

/**
 * Space-bar ranged shot: raycast tiles along the last move direction; a hit
 * lands when the projectile visual arrives (world-time pending effect).
 * @param {import('./world.js').World} world
 * @param {number} now Date.now()
 */
export function fireRangedWeapon(world, now) {
  if (!world.playing || world.encounterId || world.weapons <= 0) return

  let { x: dx, y: dy } = world.lastMoveDir
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) {
    dx = 0
    dy = 1
  } else {
    dx /= len
    dy /= len
  }

  world.projectile = { dx, dy, expiresAt: now + PROJECTILE_FLIGHT_MS }
  world.weapons -= 1
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
  touch(world)
}

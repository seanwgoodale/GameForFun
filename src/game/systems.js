import {
  ENTITY_MOVE_INTERVAL_MS,
  GOAL_BONUS,
  HEALTH_PACK_AUTO_USE_THRESHOLD,
  HEALTH_PICKUP_AMOUNT,
  HOSTILE_AGGRO_RANGE,
  HOSTILE_PROJECTILE_FLIGHT_MS,
  HOSTILE_RESET_RANGE,
  HOSTILE_SHOT_CHANCE,
  HOSTILE_SHOT_DAMAGE_PERCENT,
  HOSTILE_SHOT_INTERVAL_MAX_MS,
  HOSTILE_SHOT_INTERVAL_MIN_MS,
  HOSTILE_SHOT_RANGE,
  HOUSE_HEAL_PER_SEC,
  MAX_HEALTH,
  PLAYER_INTERACT_RADIUS_SQ,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  RADIATION_DAMAGE,
  RADIATION_PULSE_MAX,
  RADIATION_PULSE_MIN,
  VISION_RADIUS,
  ZOMBIES_TO_ELIMINATE,
  ZOMBIE_CONTACT_COOLDOWN_MS,
  ZOMBIE_CONTACT_DAMAGE_MAX,
  ZOMBIE_CONTACT_DAMAGE_MIN,
} from '../utils/constants.js'
import { getRadiationPulseRadius } from '../utils/helpers.js'
import { expandVision } from './fogVision.js'
import { tickEntityPositions } from './levelGen.js'
import { distSq, distSqToTileCenter, stepSmoothPlayer } from './movement.js'
import { applyDamage, entityCenter, patchEntity, touch } from './world.js'

const HOSTILE_AGGRO_SQ = HOSTILE_AGGRO_RANGE * HOSTILE_AGGRO_RANGE
const HOSTILE_RESET_SQ = HOSTILE_RESET_RANGE * HOSTILE_RESET_RANGE
const HOSTILE_SHOT_RANGE_SQ = HOSTILE_SHOT_RANGE * HOSTILE_SHOT_RANGE

/**
 * Advance the whole simulation by one frame.
 *
 * Ordering matches the original per-frame loop: wander cadence, player movement,
 * exit check, hostile AI, encounter trigger, contact damage, radiation, pickups,
 * house heal, vision. While an encounter modal is open only pending timed effects
 * advance (in-flight shots still land, as before).
 *
 * @param {import('./world.js').World} world
 * @param {number} dtSec frame delta, seconds (clamped by caller)
 * @param {number} now world clock, ms (Date.now())
 * @param {{ x: number; y: number }} intent movement intent, -1..1 per axis
 * @param {() => number} [rng]
 */
export function updateWorld(world, dtSec, now, intent, rng = Math.random) {
  if (!world.playing) return

  processPendingEffects(world, now)
  expireProjectileVisuals(world, now)

  if (world.encounterId) return

  wanderEntities(world, dtSec, now, rng)
  movePlayer(world, dtSec, intent)
  checkExit(world)
  runHostileAI(world, now, rng)
  triggerEncounter(world, now)
  applyZombieContact(world, now, rng)
  applyRadiation(world, now)
  collectPickups(world)
  healOnHouse(world, dtSec)
  updateVision(world)
}

function processPendingEffects(world, now) {
  if (world.pendingEffects.length === 0) return
  const due = world.pendingEffects.filter((fx) => now >= fx.at)
  if (due.length === 0) return
  world.pendingEffects = world.pendingEffects.filter((fx) => now < fx.at)
  for (const fx of due) {
    if (fx.type === 'hostile-shot-damage') {
      applyDamage(world, fx.amount)
    } else if (fx.type === 'ranged-hit') {
      if (fx.targetKind === 'zombie') {
        world.zombiesKilled += 1
        world.score += fx.score ?? 0
        patchEntity(world, fx.targetId, { defeated: true })
      } else {
        patchEntity(world, fx.targetId, { angryUntil: now + fx.angryMs })
      }
    }
  }
  touch(world)
}

function expireProjectileVisuals(world, now) {
  if (world.projectile && now >= world.projectile.expiresAt) {
    world.projectile = null
    touch(world)
  }
  if (world.hostileProjectile && now >= world.hostileProjectile.expiresAt) {
    world.hostileProjectile = null
    touch(world)
  }
}

function wanderEntities(world, dtSec, now, rng) {
  world.wanderAccumMs += dtSec * 1000
  if (world.wanderAccumMs < ENTITY_MOVE_INTERVAL_MS) return
  world.wanderAccumMs -= ENTITY_MOVE_INTERVAL_MS
  // Drop any backlog (e.g. returning from a background tab) — one step per cadence.
  world.wanderAccumMs = Math.min(world.wanderAccumMs, ENTITY_MOVE_INTERVAL_MS)
  world.entities = tickEntityPositions(
    world.entities,
    world.wallSet,
    world.cols,
    world.rows,
    world.exitCell,
    world.player,
    rng,
  )
  touch(world)
}

function movePlayer(world, dtSec, intent) {
  if (intent.x !== 0 || intent.y !== 0) {
    world.lastMoveDir = { x: intent.x, y: intent.y }
  }
  const p = world.player
  const moved = stepSmoothPlayer(
    p.x,
    p.y,
    dtSec,
    intent.x,
    intent.y,
    PLAYER_MOVE_SPEED,
    world.wallSet,
    world.cols,
    world.rows,
    PLAYER_RADIUS,
  )
  if (moved.x !== p.x || moved.y !== p.y) {
    world.player = moved
    touch(world)
  }
}

function checkExit(world) {
  if (world.exitReached) return
  const { x, y } = world.player
  const dsq = distSqToTileCenter(x, y, world.exitCell.x, world.exitCell.y)
  if (dsq < PLAYER_INTERACT_RADIUS_SQ) {
    if (world.zombiesKilled >= ZOMBIES_TO_ELIMINATE) {
      world.exitReached = true
      world.exitBlocked = false
      world.score += GOAL_BONUS
      world.playing = false
      world.pendingEndScore = world.score
      touch(world)
    } else if (!world.exitBlocked) {
      world.exitBlocked = true
      touch(world)
    }
  } else if (world.exitBlocked) {
    world.exitBlocked = false
    touch(world)
  }
}

/**
 * Zombies inside aggro range decide once: shoot (and keep shooting on a random
 * cadence) or never engage. Leaving the reset radius clears the decision.
 * Traders never shoot.
 */
function runHostileAI(world, now, rng) {
  const { x: px, y: py } = world.player
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'zombie') continue
    const ec = entityCenter(e)
    const dsq = distSq(px, py, ec.x, ec.y)
    if (dsq > HOSTILE_RESET_SQ) {
      world.hostileApproach.delete(e.id)
      continue
    }
    if (dsq > HOSTILE_AGGRO_SQ || dsq > HOSTILE_SHOT_RANGE_SQ) continue

    const decided = world.hostileApproach.get(e.id)
    if (!decided) {
      if (rng() < HOSTILE_SHOT_CHANCE) {
        world.hostileApproach.set(e.id, {
          lastShotTime: now,
          nextShotDelay: randShotInterval(rng),
        })
        fireHostileShot(world, e, now)
      } else {
        world.hostileApproach.set(e.id, 'no-engage')
      }
      continue
    }
    if (decided === 'no-engage') continue
    if (now >= decided.lastShotTime + decided.nextShotDelay) {
      decided.lastShotTime = now
      decided.nextShotDelay = randShotInterval(rng)
      fireHostileShot(world, e, now)
    }
  }
}

function randShotInterval(rng) {
  return (
    HOSTILE_SHOT_INTERVAL_MIN_MS +
    rng() * (HOSTILE_SHOT_INTERVAL_MAX_MS - HOSTILE_SHOT_INTERVAL_MIN_MS)
  )
}

function fireHostileShot(world, e, now) {
  const at = now + HOSTILE_PROJECTILE_FLIGHT_MS
  world.hostileProjectile = {
    ex: Math.floor(e.x),
    ey: Math.floor(e.y),
    expiresAt: at,
  }
  world.pendingEffects.push({
    at,
    type: 'hostile-shot-damage',
    amount: Math.round(MAX_HEALTH * HOSTILE_SHOT_DAMAGE_PERCENT),
  })
  touch(world)
}

/**
 * Walking into a live zombie or willing trader opens the encounter modal.
 * 'no-engage' hostiles, traded traders, and angry traders are pass-through.
 */
function triggerEncounter(world, now) {
  const { x, y } = world.player
  for (const e of world.entities) {
    if (e.defeated) continue
    if (e.kind !== 'zombie' && e.kind !== 'trader') continue
    if (e.kind === 'trader') {
      if (e.traded) continue
      if (e.angryUntil && now < e.angryUntil) continue
    }
    if (world.hostileApproach.get(e.id) === 'no-engage') continue
    const ec = entityCenter(e)
    if (distSq(x, y, ec.x, ec.y) < PLAYER_INTERACT_RADIUS_SQ) {
      world.weaponFeedback = null
      world.encounterId = e.id
      world.encounterStep = 'question'
      touch(world)
      break
    }
  }
}

function applyZombieContact(world, now, rng) {
  if (now - world.lastZombieContact < ZOMBIE_CONTACT_COOLDOWN_MS) return
  const { x, y } = world.player
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'zombie') continue
    const ec = entityCenter(e)
    if (distSq(x, y, ec.x, ec.y) >= PLAYER_INTERACT_RADIUS_SQ) continue
    world.lastZombieContact = now
    const frac =
      ZOMBIE_CONTACT_DAMAGE_MIN +
      rng() * (ZOMBIE_CONTACT_DAMAGE_MAX - ZOMBIE_CONTACT_DAMAGE_MIN)
    applyDamage(world, Math.round(MAX_HEALTH * frac))
    break
  }
}

/** Each pulsing hotspot damages once per run (tracked by entity id). */
function applyRadiation(world, now) {
  const { x, y } = world.player
  let total = 0
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'radiation') continue
    if (world.hazardHits.has(e.id)) continue
    const radius = getRadiationPulseRadius(
      e,
      now,
      RADIATION_PULSE_MIN,
      RADIATION_PULSE_MAX,
    )
    if (distSq(x, y, e.x + 0.5, e.y + 0.5) >= radius * radius) continue
    world.hazardHits.add(e.id)
    total += RADIATION_DAMAGE
  }
  if (total > 0) applyDamage(world, total)
}

function collectPickups(world) {
  const { x, y } = world.player
  const picked = new Set()
  let healAmt = 0
  let weaponAmt = 0
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'pickup') continue
    const ec = entityCenter(e)
    if (distSq(x, y, ec.x, ec.y) < PLAYER_INTERACT_RADIUS_SQ) {
      picked.add(e.id)
      if (e.pickupType === 'health') healAmt += HEALTH_PICKUP_AMOUNT
      else if (e.pickupType === 'weapon') weaponAmt += 1
    }
  }
  if (picked.size === 0) return
  world.entities = world.entities.map((e) =>
    picked.has(e.id) ? { ...e, defeated: true } : e,
  )
  if (healAmt > 0) {
    if (world.health < MAX_HEALTH * HEALTH_PACK_AUTO_USE_THRESHOLD) {
      world.health = Math.min(MAX_HEALTH, world.health + healAmt)
    } else {
      world.healthPacks += Math.floor(healAmt / HEALTH_PICKUP_AMOUNT)
    }
  }
  if (weaponAmt > 0) world.weapons += weaponAmt
  touch(world)
}

function healOnHouse(world, dtSec) {
  if (world.health >= MAX_HEALTH) return
  const { x, y } = world.player
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'house') continue
    if (distSqToTileCenter(x, y, e.x, e.y) < PLAYER_INTERACT_RADIUS_SQ) {
      world.health = Math.min(
        MAX_HEALTH,
        world.health + HOUSE_HEAL_PER_SEC * dtSec,
      )
      touch(world)
      return
    }
  }
}

/** Fog only expands when the player crosses into a new tile. */
function updateVision(world) {
  const tx = Math.floor(world.player.x)
  const ty = Math.floor(world.player.y)
  const last = world.lastVisionTile
  if (last && last.x === tx && last.y === ty) return
  world.lastVisionTile = { x: tx, y: ty }
  world.revealed = expandVision(
    world.revealed,
    tx,
    ty,
    VISION_RADIUS,
    world.cols,
    world.rows,
  )
  touch(world)
}

import {
  CHASE_RESET_MARGIN,
  CHASE_STANDOFF,
  ENTITY_MOVE_INTERVAL_MS,
  GLOWER_AURA_COOLDOWN_MS,
  GLOWER_AURA_DAMAGE,
  GLOWER_AURA_RADIUS,
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
  RUNNER_RANGE_BONUS,
  RUNNER_SPEED_BONUS,
  SCREAM_CHASE_MS,
  SCREAM_COOLDOWN_MS,
  SCREAM_RADIUS,
  SUPPLY_DROP_AMMO,
  SUPPLY_DROP_DURATION_MS,
  SUPPLY_DROP_MAX_DIST,
  SUPPLY_DROP_MEDKITS,
  SUPPLY_DROP_MIN_DIST,
  SUPPLY_DROP_SCORE,
  VISION_RADIUS,
  ZOMBIES_TO_ELIMINATE,
  ZOMBIE_CONTACT_COOLDOWN_MS,
  ZOMBIE_CONTACT_DAMAGE_MAX,
  ZOMBIE_CONTACT_DAMAGE_MIN,
} from '../utils/constants.js'
import { cellKey, getRadiationPulseRadius } from '../utils/helpers.js'
import { expandVision } from './fogVision.js'
import { tickEntityPositions } from './levelGen.js'
import { distSq, distSqToTileCenter, stepSmoothPlayer } from './movement.js'
import {
  applyDamage,
  entityCenter,
  patchEntity,
  pushEvent,
  touch,
} from './world.js'

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
  chaseZombies(world, dtSec, now)
  applyGlowerAura(world, now)
  checkExit(world)
  runHostileAI(world, now, rng)
  triggerEncounter(world, now)
  applyZombieContact(world, now, rng)
  applyRadiation(world, now)
  updateSupplyDrop(world, now, rng)
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
      const target = world.entities.find((e) => e.id === fx.targetId)
      if (fx.targetKind === 'zombie') {
        world.zombiesKilled += 1
        world.score += fx.score ?? 0
        patchEntity(world, fx.targetId, { defeated: true })
        if (target)
          pushEvent(world, { type: 'kill', x: target.x, y: target.y })
      } else {
        patchEntity(world, fx.targetId, { angryUntil: now + fx.angryMs })
        if (target)
          pushEvent(world, { type: 'anger', x: target.x, y: target.y })
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
      world.endReason = 'extract'
      pushEvent(world, { type: 'extract' })
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
 * Pursuit: zombies inside their chase range (difficulty-tuned, wider for
 * runners) close on the player smoothly, sliding along walls. Screamers wake
 * every zombie in earshot into a timed chase when they aggro. Chasers are
 * skipped by the random-wander tick.
 */
function chaseZombies(world, dtSec, now) {
  const { x: px, y: py } = world.player
  const { chaseSpeed, chaseRange } = world.tuning
  let changed = false
  /** @type {{x: number, y: number}[]} */
  const screams = []

  const next = world.entities.map((e) => {
    if (e.defeated || e.kind !== 'zombie') return e
    const runner = e.archetype === 'runner'
    const speed = chaseSpeed + (runner ? RUNNER_SPEED_BONUS : 0)
    const range = chaseRange + (runner ? RUNNER_RANGE_BONUS : 0)
    const dist = Math.hypot(px - e.x, py - e.y)

    const wasChasing = e.chasing === true
    let chasing = wasChasing
    if (e.screamWakeUntil != null && now < e.screamWakeUntil) chasing = true
    else if (dist <= range) chasing = true
    else if (dist > range + CHASE_RESET_MARGIN) chasing = false

    let out = e
    if (chasing !== wasChasing) {
      out = { ...out, chasing }
      changed = true
      if (
        chasing &&
        e.archetype === 'screamer' &&
        now >= (e.nextScreamAt ?? 0)
      ) {
        out.nextScreamAt = now + SCREAM_COOLDOWN_MS
        screams.push({ x: e.x, y: e.y })
      }
    }
    if (chasing && dist > CHASE_STANDOFF) {
      const moved = stepSmoothPlayer(
        out.x,
        out.y,
        dtSec,
        (px - out.x) / dist,
        (py - out.y) / dist,
        speed,
        world.wallSet,
        world.cols,
        world.rows,
        0.3,
      )
      if (moved.x !== out.x || moved.y !== out.y) {
        if (out === e) out = { ...e, chasing }
        out.x = moved.x
        out.y = moved.y
        changed = true
      }
    }
    return out
  })

  if (changed) {
    world.entities = next
    touch(world)
  }

  for (const s of screams) {
    pushEvent(world, { type: 'scream', x: s.x, y: s.y })
    world.entities = world.entities.map((e) => {
      if (e.defeated || e.kind !== 'zombie') return e
      if (Math.hypot(e.x - s.x, e.y - s.y) > SCREAM_RADIUS) return e
      return { ...e, screamWakeUntil: now + SCREAM_CHASE_MS, chasing: true }
    })
    touch(world)
  }
}

/** Glowing ones leak radiation: standing close ticks damage on a cooldown. */
function applyGlowerAura(world, now) {
  const { x, y } = world.player
  const rSq = GLOWER_AURA_RADIUS * GLOWER_AURA_RADIUS
  for (const e of world.entities) {
    if (e.defeated || e.kind !== 'zombie' || e.archetype !== 'glower') continue
    if (distSq(x, y, e.x, e.y) > rSq) continue
    if (now - (world.glowerHits.get(e.id) ?? 0) < GLOWER_AURA_COOLDOWN_MS)
      continue
    world.glowerHits.set(e.id, now)
    applyDamage(world, GLOWER_AURA_DAMAGE)
  }
}

/**
 * Side objective: a flare marks a supply cache some distance away; its
 * contents burn out if not grabbed in time. First grab pays a score bonus.
 */
function updateSupplyDrop(world, now, rng) {
  const drop = world.supplyDrop
  if (!drop || drop.state === 'done') return
  if (drop.state === 'pending') {
    if (now < drop.spawnAt) return
    for (let i = 0; i < 140; i++) {
      const x = 1 + Math.floor(rng() * (world.cols - 2))
      const y = 1 + Math.floor(rng() * (world.rows - 2))
      if (world.wallSet.has(cellKey(x, y))) continue
      const d = Math.max(
        Math.abs(x + 0.5 - world.player.x),
        Math.abs(y + 0.5 - world.player.y),
      )
      if (d < SUPPLY_DROP_MIN_DIST || d > SUPPLY_DROP_MAX_DIST) continue
      drop.state = 'active'
      drop.x = x
      drop.y = y
      drop.expiresAt = now + SUPPLY_DROP_DURATION_MS
      const items = []
      for (let m = 0; m < SUPPLY_DROP_MEDKITS; m++)
        items.push({ id: `drop-h-${m}`, kind: 'pickup', pickupType: 'health', x, y })
      for (let a = 0; a < SUPPLY_DROP_AMMO; a++)
        items.push({ id: `drop-w-${a}`, kind: 'pickup', pickupType: 'weapon', x, y })
      world.entities = [...world.entities, ...items]
      pushEvent(world, { type: 'supply-drop', x, y })
      touch(world)
      return
    }
    drop.spawnAt = now + 5000 // no legal spot this instant; retry shortly
    return
  }
  if (now >= drop.expiresAt) {
    drop.state = 'done'
    world.entities = world.entities.map((e) =>
      e.id.startsWith('drop-') && !e.defeated ? { ...e, defeated: true } : e,
    )
    pushEvent(world, { type: 'supply-drop-expired' })
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
    // Renderer-only: interpolate the tracer toward where the player was.
    sx: e.x,
    sy: e.y,
    tx: world.player.x,
    ty: world.player.y,
    startAt: now,
    expiresAt: at,
  }
  pushEvent(world, { type: 'hostile-shot', x: e.x, y: e.y })
  world.pendingEffects.push({
    at,
    type: 'hostile-shot-damage',
    amount: Math.round(MAX_HEALTH * HOSTILE_SHOT_DAMAGE_PERCENT),
  })
  touch(world)
}

/**
 * Walking into a live zombie or willing trader opens its encounter.
 * 'no-engage' hostiles, traded/angry traders, and recently-pacified
 * survivors are pass-through.
 */
function triggerEncounter(world, now) {
  const { x, y } = world.player
  for (const e of world.entities) {
    if (e.defeated) continue
    if (e.kind !== 'zombie' && e.kind !== 'trader') continue
    if (e.pacifiedUntil && now < e.pacifiedUntil) continue
    if (e.kind === 'trader') {
      if (e.traded) continue
      if (e.angryUntil && now < e.angryUntil) continue
    }
    if (world.hostileApproach.get(e.id) === 'no-engage') continue
    const ec = entityCenter(e)
    if (distSq(x, y, ec.x, ec.y) < PLAYER_INTERACT_RADIUS_SQ) {
      world.encounterId = e.id
      world.encounterStep = 'choice'
      world.encounterResult = null
      pushEvent(world, { type: 'encounter-open', kind: e.kind })
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
  const drop = world.supplyDrop
  if (drop?.state === 'active' && [...picked].some((id) => id.startsWith('drop-'))) {
    if (!drop.rewarded) {
      drop.rewarded = true
      world.score += SUPPLY_DROP_SCORE
      pushEvent(world, { type: 'objective-complete', score: SUPPLY_DROP_SCORE })
    }
    const remaining = world.entities.some(
      (e) => e.id.startsWith('drop-') && !e.defeated,
    )
    if (!remaining) drop.state = 'done'
  }
  pushEvent(world, {
    type: 'pickup',
    x: world.player.x,
    y: world.player.y,
    health: healAmt > 0,
    weapon: weaponAmt > 0,
  })
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

import {
  STARTING_HEALTH,
  STARTING_WEAPONS,
  VISION_RADIUS,
  WORLD_COLS,
  WORLD_ROWS,
} from '../utils/constants.js'
import { expandVision } from './fogVision.js'

/**
 * @typedef {import('./levelGen.js').MapEntity} MapEntity
 *
 * @typedef {{
 *   wallSet: Set<string>
 *   pathSet: Set<string>
 *   cols: number
 *   rows: number
 *   exitCell: { x: number; y: number }
 *   spawnCell: { x: number; y: number }
 *   player: { x: number; y: number }
 *   entities: MapEntity[]
 *   revealed: Set<string>
 *   health: number
 *   weapons: number
 *   healthPacks: number
 *   score: number
 *   zombiesKilled: number
 *   playing: boolean
 *   encounterId: string | null
 *   encounterStep: 'choice' | 'result'
 *   encounterResult: { text: string; effects: object } | null
 *   encounterQuota: number
 *   exitBlocked: boolean
 *   exitReached: boolean
 *   pendingEndScore: number | null
 *   projectile: { dx: number; dy: number; expiresAt: number } | null
 *   hostileProjectile: { ex: number; ey: number; expiresAt: number } | null
 *   pendingEffects: PendingEffect[]
 *   hostileApproach: Map<string, 'no-engage' | { lastShotTime: number; nextShotDelay: number }>
 *   hazardHits: Set<string>
 *   lastZombieContact: number
 *   lastMoveDir: { x: number; y: number }
 *   wanderAccumMs: number
 *   lastVisionTile: { x: number; y: number } | null
 *   version: number
 *   dirty: boolean
 * }} World
 *
 * Timed outcome applied at world time `at` (ms). Lives inside the world, so a new
 * run (fresh world) can never be hit by effects scheduled in a previous run.
 * @typedef {(
 *   | { at: number; type: 'hostile-shot-damage'; amount: number }
 *   | { at: number; type: 'ranged-hit'; targetId: string; targetKind: string }
 * )} PendingEffect
 */

/** @returns {World} */
export function createWorld() {
  return {
    wallSet: new Set(),
    pathSet: new Set(),
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    exitCell: { x: 2, y: 2 },
    spawnCell: { x: 1, y: 1 },
    player: { x: 1.5, y: 1.5 },
    entities: [],
    revealed: new Set(),
    health: STARTING_HEALTH,
    weapons: 0,
    healthPacks: 0,
    score: 0,
    zombiesKilled: 0,
    playing: false,
    encounterId: null,
    encounterStep: 'choice',
    encounterResult: null,
    encounterQuota: 0,
    exitBlocked: false,
    exitReached: false,
    pendingEndScore: null,
    endReason: null,
    projectile: null,
    hostileProjectile: null,
    pendingEffects: [],
    hostileApproach: new Map(),
    hazardHits: new Set(),
    lastZombieContact: 0,
    lastMoveDir: { x: 0, y: 1 },
    wanderAccumMs: 0,
    lastVisionTile: null,
    events: [],
    version: 0,
    dirty: false,
  }
}

/**
 * Queue a transient gameplay event (shot fired, hit landed, pickup, death…)
 * for effects/audio consumers. Drained by the store on commit; carries no
 * game-rule weight.
 * @param {World} world
 * @param {object} event `{ type, ... }`
 */
export function pushEvent(world, event) {
  world.events.push(event)
}

/** Mark the world changed so the store publishes a new snapshot. */
export function touch(world) {
  world.dirty = true
}

/**
 * Every damage source funnels through here; reaching zero vitals ends the run
 * with the current score.
 * @param {World} world
 * @param {number} amount
 */
export function applyDamage(world, amount) {
  if (amount <= 0) return
  world.health = Math.max(0, world.health - amount)
  pushEvent(world, { type: 'damage', amount })
  if (world.health <= 0 && world.playing) {
    world.playing = false
    world.pendingEndScore = world.score
    world.endReason = 'death'
    pushEvent(world, { type: 'death' })
  }
  touch(world)
}

/**
 * Load a generated level into a fresh run. Assumes `world` is newly created.
 * @param {World} world
 * @param {ReturnType<import('./levelGen.js').generateLevel>} level
 */
export function startRun(world, level) {
  world.wallSet = level.wallSet
  world.pathSet =
    level.pathSet instanceof Set
      ? new Set(level.pathSet)
      : new Set(level.pathSet ?? [])
  world.cols = level.cols
  world.rows = level.rows
  world.exitCell = { ...level.exitCell }
  world.spawnCell = { ...level.playerStart }
  world.player = {
    x: level.playerStart.x + 0.5,
    y: level.playerStart.y + 0.5,
  }
  world.entities = level.entities.map((e) => ({ ...e }))
  world.encounterQuota = world.entities.filter(
    (e) => (e.kind === 'zombie' || e.kind === 'trader') && Boolean(e.scenarioId),
  ).length
  world.revealed = expandVision(
    new Set(),
    level.playerStart.x,
    level.playerStart.y,
    VISION_RADIUS,
    level.cols,
    level.rows,
  )
  world.lastVisionTile = { ...level.playerStart }
  world.health = STARTING_HEALTH
  world.weapons = STARTING_WEAPONS
  world.playing = true
  touch(world)
}

/** Entity center for distance checks (hostiles use float x,y; others tile+0.5). */
export function entityCenter(e) {
  if (e.kind === 'zombie' || e.kind === 'trader') return { x: e.x, y: e.y }
  const tx = Number.isInteger(e.x) ? e.x : Math.floor(e.x)
  const ty = Number.isInteger(e.y) ? e.y : Math.floor(e.y)
  return { x: tx + 0.5, y: ty + 0.5 }
}

/**
 * Copy-on-write entity update: React memoization relies on `entities` getting a
 * new array identity whenever contents change.
 * @param {World} world
 * @param {string} id
 * @param {object} patch
 */
export function patchEntity(world, id, patch) {
  world.entities = world.entities.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  )
  touch(world)
}

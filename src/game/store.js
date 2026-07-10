import { getScenarioById } from '../data/scenarios.js'
import {
  VIEWPORT_COLS,
  VIEWPORT_ROWS,
  WORLD_COLS,
  WORLD_ROWS,
  ZOMBIES_TO_ELIMINATE,
} from '../utils/constants.js'
import * as actions from './actions.js'
import { readMoveIntent } from './input.js'
import { generateLevel } from './levelGen.js'
import { updateWorld } from './systems.js'
import { createWorld, startRun, touch } from './world.js'

/**
 * Owns the world, the single requestAnimationFrame loop, and the input state.
 * React subscribes via `subscribe`/`getSnapshot` (useSyncExternalStore); the
 * snapshot is rebuilt only when the world changed that frame.
 *
 * Every run gets a brand-new world object, so nothing scheduled in a previous
 * run (projectiles, AI decisions) can leak into the next one.
 */
export class GameStore {
  constructor() {
    this.world = createWorld()
    this.listeners = new Set()
    /** Ref-shaped so existing hooks/components can share them. */
    this.moveKeysRef = { current: new Set() }
    this.touchAnalogRef = { current: { x: 0, y: 0 } }
    this.rafId = 0
    this.lastFrameTime = 0
    this.snapshot = null
    this.snapshotVersion = -1
    this.loop = this.loop.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.getSnapshot = this.getSnapshot.bind(this)
    this.startGame = this.startGame.bind(this)
    this.reset = this.reset.bind(this)
    this.stopGame = this.stopGame.bind(this)
    this.clearPendingEnd = this.clearPendingEnd.bind(this)
    this.submitEncounterAnswer = this.submitEncounterAnswer.bind(this)
    this.pickTraderReward = this.pickTraderReward.bind(this)
    this.tryWeaponOnEncounter = this.tryWeaponOnEncounter.bind(this)
    this.fireRangedWeapon = this.fireRangedWeapon.bind(this)
    this.useHealthPack = this.useHealthPack.bind(this)
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot() {
    if (!this.snapshot || this.world.version !== this.snapshotVersion) {
      this.snapshot = buildSnapshot(this.world)
      this.snapshotVersion = this.world.version
    }
    return this.snapshot
  }

  /** Publish after mutations: bump version once and wake subscribers. */
  commit() {
    if (!this.world.dirty) return
    this.world.dirty = false
    this.world.version += 1
    for (const listener of [...this.listeners]) listener()
  }

  startGame() {
    this.stopLoop()
    this.world = createWorld()
    startRun(this.world, generateLevel({ cols: WORLD_COLS, rows: WORLD_ROWS }))
    this.moveKeysRef.current.clear()
    this.touchAnalogRef.current.x = 0
    this.touchAnalogRef.current.y = 0
    this.commit()
    this.startLoop()
  }

  /** Back to home screen: halt the sim, keep nothing pending. */
  reset() {
    this.stopLoop()
    if (this.world.playing || this.world.pendingEndScore != null) {
      this.world.playing = false
      this.world.pendingEndScore = null
      touch(this.world)
    }
    this.moveKeysRef.current.clear()
    this.touchAnalogRef.current.x = 0
    this.touchAnalogRef.current.y = 0
    this.commit()
  }

  stopGame() {
    if (!this.world.playing) return
    this.world.playing = false
    touch(this.world)
    this.commit()
  }

  clearPendingEnd() {
    if (this.world.pendingEndScore == null) return
    this.world.pendingEndScore = null
    touch(this.world)
    this.commit()
  }

  submitEncounterAnswer(optionIndex) {
    actions.submitEncounterAnswer(this.world, optionIndex)
    this.commit()
  }

  pickTraderReward(choice) {
    actions.pickTraderReward(this.world, choice)
    this.commit()
  }

  tryWeaponOnEncounter() {
    actions.tryWeaponOnEncounter(this.world)
    this.commit()
  }

  fireRangedWeapon() {
    actions.fireRangedWeapon(this.world, Date.now())
    this.commit()
  }

  useHealthPack() {
    actions.useHealthPack(this.world)
    this.commit()
  }

  startLoop() {
    if (this.rafId) return
    this.lastFrameTime = performance.now()
    this.rafId = window.requestAnimationFrame(this.loop)
  }

  stopLoop() {
    if (!this.rafId) return
    window.cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  loop(frameTime) {
    this.rafId = 0
    const dtSec = Math.min(0.05, (frameTime - this.lastFrameTime) / 1000)
    this.lastFrameTime = frameTime

    const intent = readMoveIntent(
      this.moveKeysRef.current,
      this.touchAnalogRef.current,
    )
    updateWorld(this.world, dtSec, Date.now(), intent)
    this.commit()

    if (this.world.playing) {
      this.rafId = window.requestAnimationFrame(this.loop)
    }
  }
}

/** @param {import('./world.js').World} world */
function buildSnapshot(world) {
  const encounterEntity = world.encounterId
    ? (world.entities.find((e) => e.id === world.encounterId) ?? null)
    : null
  const encounterScenario = encounterEntity?.scenarioId
    ? getScenarioById(encounterEntity.scenarioId)
    : null
  return {
    MAP_COLS: world.cols,
    MAP_ROWS: world.rows,
    VIEWPORT_COLS,
    VIEWPORT_ROWS,
    wallSet: world.wallSet,
    pathSet: world.pathSet,
    revealed: world.revealed,
    player: { x: world.player.x, y: world.player.y },
    entities: world.entities,
    projectile: world.projectile,
    hostileProjectile: world.hostileProjectile,
    health: world.health,
    weapons: world.weapons,
    healthPacks: world.healthPacks,
    weaponFeedback: world.weaponFeedback,
    score: world.score,
    playing: world.playing,
    encounterId: world.encounterId,
    encounterEntity,
    encounterScenario,
    encounterStep: world.encounterStep,
    encounterTotal: world.encounterQuota,
    encountersCleared: world.entities.filter((e) => e.scenarioId && e.defeated)
      .length,
    zombiesKilled: world.zombiesKilled,
    zombiesToEliminate: ZOMBIES_TO_ELIMINATE,
    exitBlocked: world.exitBlocked,
    pendingEndScore: world.pendingEndScore,
    exitCell: { ...world.exitCell },
    spawnCell: { ...world.spawnCell },
  }
}

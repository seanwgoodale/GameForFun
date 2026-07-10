import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getScenarioById } from '../data/scenarios.js'
import { cellKey, getRadiationPulseRadius } from '../utils/helpers.js'
import {
  ENTITY_MOVE_INTERVAL_MS,
  GOAL_BONUS,
  HEALTH_PACK_AUTO_USE_THRESHOLD,
  HEALTH_PICKUP_AMOUNT,
  HOUSE_HEAL_PER_SEC,
  HOSTILE_AGGRO_RANGE,
  HOSTILE_RESET_RANGE,
  HOSTILE_SHOT_CHANCE,
  HOSTILE_SHOT_DAMAGE_PERCENT,
  HOSTILE_SHOT_INTERVAL_MAX_MS,
  HOSTILE_SHOT_INTERVAL_MIN_MS,
  HOSTILE_PROJECTILE_FLIGHT_MS,
  HOSTILE_SHOT_RANGE,
  PROJECTILE_FLIGHT_MS,
  MAX_HEALTH,
  PLAYER_INTERACT_RADIUS_SQ,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  RADIATION_DAMAGE,
  RADIATION_PULSE_MAX,
  RADIATION_PULSE_MIN,
  RANGED_SHOT_RANGE,
  TRADER_AMMO_REWARD,
  TRADER_HEALTH_PACK_REWARD,
  TRADER_ANGRY_DURATION_MS,
  ZOMBIES_TO_ELIMINATE,
  ZOMBIE_CONTACT_DAMAGE_MIN,
  ZOMBIE_CONTACT_DAMAGE_MAX,
  ZOMBIE_CONTACT_COOLDOWN_MS,
  STARTING_HEALTH,
  STARTING_WEAPONS,
  VIEWPORT_COLS,
  VIEWPORT_ROWS,
  VISION_RADIUS,
  WEAPON_KILL_CHANCE,
  WEAPON_KILL_SCORE,
  WEAPON_MISS_DAMAGE,
  WORLD_COLS,
  WORLD_ROWS,
  WRONG_ANSWER_DAMAGE,
} from '../utils/constants.js'
import { expandVision } from '../utils/fogVision.js'
import { generateLevel, tickEntityPositions } from '../utils/generateLevel.js'
import {
  distSq,
  distSqToTileCenter,
  stepSmoothPlayer,
} from '../utils/playerMovement.js'
import { applyScoreDelta, pointsForAnswer } from '../utils/scoring.js'
import { readMoveIntent } from './useMapControls.js'

/** Entity center for distance checks (hostiles use float x,y; others use tile+0.5). */
function entityCenter(e) {
  if (e.kind === 'zombie' || e.kind === 'trader') return { x: e.x, y: e.y }
  const tx = Number.isInteger(e.x) ? e.x : Math.floor(e.x)
  const ty = Number.isInteger(e.y) ? e.y : Math.floor(e.y)
  return { x: tx + 0.5, y: ty + 0.5 }
}

/**
 * Smooth movement + fog + roaming encounters. New layout every `startGame`.
 */
export function useGameState() {
  const [wallSet, setWallSet] = useState(() => new Set())
  const [pathSet, setPathSet] = useState(() => new Set())
  const [mapCols, setMapCols] = useState(WORLD_COLS)
  const [mapRows, setMapRows] = useState(WORLD_ROWS)
  const [player, setPlayer] = useState({ x: 1.5, y: 1.5 })
  const [exitCell, setExitCell] = useState({ x: 2, y: 2 })
  const [spawnCell, setSpawnCell] = useState({ x: 1, y: 1 })
  const [entities, setEntities] = useState([])
  const [revealed, setRevealed] = useState(() => new Set())
  const [health, setHealth] = useState(STARTING_HEALTH)
  const [weapons, setWeapons] = useState(0)
  const [healthPacks, setHealthPacks] = useState(0)
  const [weaponFeedback, setWeaponFeedback] = useState(
    /** @type {'hit' | 'miss' | null} */ (null),
  )
  const [score, setScore] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [encounterId, setEncounterId] = useState(null)
  const [pendingEndScore, setPendingEndScore] = useState(null)
  const [encounterQuota, setEncounterQuota] = useState(0)
  const [zombiesKilled, setZombiesKilled] = useState(0)
  const [exitBlocked, setExitBlocked] = useState(false)
  const [encounterStep, setEncounterStep] = useState(
    /** @type {'question' | 'reward'} */ ('question'),
  )
  const [projectile, setProjectile] = useState(/** @type {{ dx: number; dy: number } | null} */ (null))
  const [hostileProjectile, setHostileProjectile] = useState(
    /** @type {{ ex: number; ey: number } | null} */ (null),
  )

  const scoreRef = useRef(0)
  const hazardHitsRef = useRef({})
  const simPosRef = useRef({ x: 1.5, y: 1.5 })
  const exitReachedRef = useRef(false)
  const moveKeysRef = useRef(new Set())
  /** Normalized -1..1 from mobile thumb stick (mutated each frame / touch). */
  const touchAnalogRef = useRef({ x: 0, y: 0 })
  const weaponsRef = useRef(0)
  /** Last non-zero move direction for Space-bar ranged shot. */
  const lastMoveDirRef = useRef({ x: 0, y: 1 })
  /** Entity id -> 'no-engage' | { lastShotTime, nextShotDelay } for aggro state. */
  const hostileApproachRef = useRef(
    /** @type {Map<string, 'no-engage' | { lastShotTime: number; nextShotDelay: number }>>} */ (
      new Map()
    )
  )
  const projectileClearRef = useRef(null)
  const zombiesKilledRef = useRef(0)
  const lastZombieContactRef = useRef(0)

  useEffect(() => {
    weaponsRef.current = weapons
  }, [weapons])
  useEffect(() => {
    zombiesKilledRef.current = zombiesKilled
  }, [zombiesKilled])

  const snapRef = useRef({
    playing: false,
    encounterId: null,
    player: { x: 1.5, y: 1.5 },
    entities: [],
    wallSet: new Set(),
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    exitCell: { x: 2, y: 2 },
  })

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    snapRef.current = {
      playing,
      encounterId,
      player,
      entities,
      wallSet,
      cols: mapCols,
      rows: mapRows,
      exitCell,
    }
  }, [
    playing,
    encounterId,
    player,
    entities,
    wallSet,
    mapCols,
    mapRows,
    exitCell,
  ])

  const encounterEntity = useMemo(
    () => entities.find((e) => e.id === encounterId) ?? null,
    [entities, encounterId],
  )

  const encounterScenario = useMemo(() => {
    if (!encounterEntity?.scenarioId) return null
    return getScenarioById(encounterEntity.scenarioId)
  }, [encounterEntity])

  const encountersCleared = useMemo(
    () => entities.filter((e) => e.scenarioId && e.defeated).length,
    [entities],
  )

  const clearPendingEnd = useCallback(() => {
    setPendingEndScore(null)
  }, [])

  const applyLevel = useCallback((level) => {
    setWallSet(level.wallSet)
    setPathSet(
      level.pathSet instanceof Set
        ? new Set(level.pathSet)
        : new Set(level.pathSet ?? []),
    )
    setMapCols(level.cols)
    setMapRows(level.rows)
    const px = level.playerStart.x + 0.5
    const py = level.playerStart.y + 0.5
    simPosRef.current = { x: px, y: py }
    setPlayer({ x: px, y: py })
    setExitCell({ ...level.exitCell })
    setSpawnCell({ ...level.playerStart })
    setEntities(level.entities.map((e) => ({ ...e })))
    setZombiesKilled(0)
    setExitBlocked(false)
    setEncounterQuota(
      level.entities.filter(
        (e) =>
          (e.kind === 'zombie' || e.kind === 'trader') &&
          Boolean(e.scenarioId),
      ).length,
    )
    setRevealed(
      expandVision(
        new Set(),
        level.playerStart.x,
        level.playerStart.y,
        VISION_RADIUS,
        level.cols,
        level.rows,
      ),
    )
  }, [])

  const startGame = useCallback(() => {
    exitReachedRef.current = false
    hostileApproachRef.current.clear()
    lastZombieContactRef.current = 0
    if (projectileClearRef.current) {
      clearTimeout(projectileClearRef.current)
      projectileClearRef.current = null
    }
    setProjectile(null)
    setHostileProjectile(null)
    const level = generateLevel({
      cols: WORLD_COLS,
      rows: WORLD_ROWS,
    })
    applyLevel(level)
    setHealth(STARTING_HEALTH)
    setWeapons(STARTING_WEAPONS)
    setHealthPacks(0)
    setWeaponFeedback(null)
    setScore(0)
    setPlaying(true)
    setEncounterId(null)
    hazardHitsRef.current = {}
    moveKeysRef.current.clear()
    touchAnalogRef.current = { x: 0, y: 0 }
    setPendingEndScore(null)
  }, [applyLevel])

  const reset = useCallback(() => {
    setPlaying(false)
    setEncounterId(null)
    setWeaponFeedback(null)
    hazardHitsRef.current = {}
    hostileApproachRef.current.clear()
    if (projectileClearRef.current) {
      clearTimeout(projectileClearRef.current)
      projectileClearRef.current = null
    }
    setProjectile(null)
    setHostileProjectile(null)
    moveKeysRef.current.clear()
    touchAnalogRef.current = { x: 0, y: 0 }
    setPendingEndScore(null)
  }, [])

  const stopGame = useCallback(() => {
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing || encounterId) return

    const id = window.setInterval(() => {
      const s = snapRef.current
      if (!s.playing || s.encounterId) return

      const moved = tickEntityPositions(
        s.entities,
        s.wallSet,
        s.cols,
        s.rows,
        s.exitCell,
        s.player,
        Math.random,
      )
      setEntities(moved)

      const px = s.player.x
      const py = s.player.y
      const now = Date.now()
      const HOSTILE_AGGRO_SQ = HOSTILE_AGGRO_RANGE * HOSTILE_AGGRO_RANGE
      const HOSTILE_RESET_SQ = HOSTILE_RESET_RANGE * HOSTILE_RESET_RANGE
      const hostileDmg = Math.round(MAX_HEALTH * HOSTILE_SHOT_DAMAGE_PERCENT)
      const randInterval = () =>
        HOSTILE_SHOT_INTERVAL_MIN_MS +
        Math.random() * (HOSTILE_SHOT_INTERVAL_MAX_MS - HOSTILE_SHOT_INTERVAL_MIN_MS)

      for (const e of moved) {
        if (e.defeated || (e.kind !== 'zombie' && e.kind !== 'trader')) continue
        if (e.kind === 'trader') continue
        const ec = entityCenter(e)
        const dsq = distSq(px, py, ec.x, ec.y)
        if (dsq > HOSTILE_RESET_SQ) {
          hostileApproachRef.current.delete(e.id)
          continue
        }
        if (dsq > HOSTILE_AGGRO_SQ) continue

        const HOSTILE_SHOT_RANGE_SQ = HOSTILE_SHOT_RANGE * HOSTILE_SHOT_RANGE
        if (dsq > HOSTILE_SHOT_RANGE_SQ) continue

        const applyHostileDmg = () => {
          setHealth((h) => {
            const nh = Math.max(0, h - hostileDmg)
            if (nh <= 0) {
              queueMicrotask(() => setPendingEndScore(scoreRef.current))
              setPlaying(false)
            }
            return nh
          })
        }

        const decided = hostileApproachRef.current.get(e.id)
        if (!decided) {
          const willShoot = Math.random() < HOSTILE_SHOT_CHANCE
          if (willShoot) {
            hostileApproachRef.current.set(e.id, {
              lastShotTime: now,
              nextShotDelay: randInterval(),
            })
            setHostileProjectile({
                ex: Math.floor(e.x),
                ey: Math.floor(e.y),
              })
            setTimeout(() => {
              setHostileProjectile(null)
              applyHostileDmg()
            }, HOSTILE_PROJECTILE_FLIGHT_MS)
          } else {
            hostileApproachRef.current.set(e.id, 'no-engage')
          }
          continue
        }
        if (decided === 'no-engage') continue

        if (now >= decided.lastShotTime + decided.nextShotDelay) {
          decided.lastShotTime = now
          decided.nextShotDelay = randInterval()
          setHostileProjectile({
                ex: Math.floor(e.x),
                ey: Math.floor(e.y),
              })
          setTimeout(() => {
            setHostileProjectile(null)
            applyHostileDmg()
          }, HOSTILE_PROJECTILE_FLIGHT_MS)
        }
      }

      const atPlayer = moved.filter((e) => {
        if (e.defeated) return false
        const ec = entityCenter(e)
        return distSq(px, py, ec.x, ec.y) < PLAYER_INTERACT_RADIUS_SQ
      })
      const nowInt = Date.now()
      for (const e of moved) {
        if (e.defeated || e.kind !== 'zombie') continue
        const ec = entityCenter(e)
        if (distSq(px, py, ec.x, ec.y) >= PLAYER_INTERACT_RADIUS_SQ) continue
        if (nowInt - lastZombieContactRef.current < ZOMBIE_CONTACT_COOLDOWN_MS)
          continue
        lastZombieContactRef.current = nowInt
        const contactDmg = Math.round(
          MAX_HEALTH *
            (ZOMBIE_CONTACT_DAMAGE_MIN +
              Math.random() *
                (ZOMBIE_CONTACT_DAMAGE_MAX - ZOMBIE_CONTACT_DAMAGE_MIN)),
        )
        setHealth((h) => {
          const nh = Math.max(0, h - contactDmg)
          if (nh <= 0) {
            queueMicrotask(() => setPendingEndScore(scoreRef.current))
            setPlaying(false)
          }
          return nh
        })
        break
      }

      const blk = atPlayer.find((e) => {
        if (e.kind === 'zombie')
          return hostileApproachRef.current.get(e.id) !== 'no-engage'
        if (e.kind === 'trader') {
          if (e.traded) return false
          if (e.angryUntil && Date.now() < e.angryUntil) return false
          return hostileApproachRef.current.get(e.id) !== 'no-engage'
        }
        return false
      })
      if (blk) {
        setWeaponFeedback(null)
        setEncounterId(blk.id)
      }

      let rad = 0
      const nextHits = { ...hazardHitsRef.current }
      const rnow = Date.now()
      for (const e of moved) {
        if (e.defeated || e.kind !== 'radiation') continue
        const radRadius = getRadiationPulseRadius(
          e,
          rnow,
          RADIATION_PULSE_MIN,
          RADIATION_PULSE_MAX,
        )
        if (distSq(px, py, e.x + 0.5, e.y + 0.5) >= radRadius * radRadius) continue
        if (nextHits[e.id]) continue
        nextHits[e.id] = true
        rad += RADIATION_DAMAGE
      }
      if (rad > 0) {
        hazardHitsRef.current = nextHits
        setHealth((h) => {
          const nh = Math.max(0, h - rad)
          if (nh <= 0) {
            queueMicrotask(() => setPendingEndScore(scoreRef.current))
            setPlaying(false)
          }
          return nh
        })
      }
    }, ENTITY_MOVE_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [playing, encounterId])

  useEffect(() => {
    if (!playing || encounterId) return

    let raf = 0
    let last = performance.now()

    const loop = (animTime) => {
      const s = snapRef.current
      if (!s.playing || s.encounterId) return

      const dt = Math.min(0.05, (animTime - last) / 1000)
      last = animTime

      const intent = readMoveIntent(
        moveKeysRef.current,
        touchAnalogRef.current,
      )
      if (intent.x !== 0 || intent.y !== 0) {
        lastMoveDirRef.current = { x: intent.x, y: intent.y }
      }
      const p = simPosRef.current
      const moved = stepSmoothPlayer(
        p.x,
        p.y,
        dt,
        intent.x,
        intent.y,
        PLAYER_MOVE_SPEED,
        s.wallSet,
        s.cols,
        s.rows,
        PLAYER_RADIUS,
      )
      let { x, y } = moved

      let openedEncounter = false

      if (!exitReachedRef.current) {
        const dsq = distSqToTileCenter(x, y, s.exitCell.x, s.exitCell.y)
        if (dsq < PLAYER_INTERACT_RADIUS_SQ) {
          if (zombiesKilledRef.current >= ZOMBIES_TO_ELIMINATE) {
            exitReachedRef.current = true
            setExitBlocked(false)
            setScore((prev) => {
              const next = prev + GOAL_BONUS
              queueMicrotask(() => {
                setPlaying(false)
                setPendingEndScore(next)
              })
              return next
            })
          } else {
            setExitBlocked(true)
          }
        } else {
          setExitBlocked(false)
        }
      }

      const now = Date.now()
      const HOSTILE_AGGRO_SQ = HOSTILE_AGGRO_RANGE * HOSTILE_AGGRO_RANGE
      const HOSTILE_RESET_SQ = HOSTILE_RESET_RANGE * HOSTILE_RESET_RANGE
      const hostileDamage = Math.round(MAX_HEALTH * HOSTILE_SHOT_DAMAGE_PERCENT)
      const randInterval = () =>
        HOSTILE_SHOT_INTERVAL_MIN_MS +
        Math.random() * (HOSTILE_SHOT_INTERVAL_MAX_MS - HOSTILE_SHOT_INTERVAL_MIN_MS)

      if (!s.encounterId) {
        for (const e of s.entities) {
          if (e.defeated) continue
          if (e.kind !== 'zombie' && e.kind !== 'trader') continue
          if (e.kind === 'trader') continue // traders never shoot
          const ec = entityCenter(e)
          const dsq = distSq(x, y, ec.x, ec.y)
          if (dsq > HOSTILE_RESET_SQ) {
            hostileApproachRef.current.delete(e.id)
            continue
          }
          if (dsq > HOSTILE_AGGRO_SQ) continue

          const HOSTILE_SHOT_RANGE_SQ = HOSTILE_SHOT_RANGE * HOSTILE_SHOT_RANGE
          if (dsq > HOSTILE_SHOT_RANGE_SQ) continue

          const applyHostileDamage = () => {
            setHealth((h) => {
              const nh = Math.max(0, h - hostileDamage)
              if (nh <= 0) {
                queueMicrotask(() => setPendingEndScore(scoreRef.current))
                setPlaying(false)
              }
              return nh
            })
          }

          const decided = hostileApproachRef.current.get(e.id)
          if (!decided) {
            const willShoot = Math.random() < HOSTILE_SHOT_CHANCE
            if (willShoot) {
              hostileApproachRef.current.set(e.id, {
                lastShotTime: now,
                nextShotDelay: randInterval(),
              })
              setHostileProjectile({
                ex: Math.floor(e.x),
                ey: Math.floor(e.y),
              })
              setTimeout(() => {
                setHostileProjectile(null)
                applyHostileDamage()
              }, HOSTILE_PROJECTILE_FLIGHT_MS)
            } else {
              hostileApproachRef.current.set(e.id, 'no-engage')
            }
            continue
          }
          if (decided === 'no-engage') continue

          if (now >= decided.lastShotTime + decided.nextShotDelay) {
            decided.lastShotTime = now
            decided.nextShotDelay = randInterval()
            setHostileProjectile({
                ex: Math.floor(e.x),
                ey: Math.floor(e.y),
              })
            setTimeout(() => {
              setHostileProjectile(null)
              applyHostileDamage()
            }, HOSTILE_PROJECTILE_FLIGHT_MS)
          }
        }

        for (const e of s.entities) {
          if (e.defeated) continue
          if (e.kind !== 'zombie' && e.kind !== 'trader') continue
          if (e.kind === 'trader') {
            if (e.traded) continue
            if (e.angryUntil && now < e.angryUntil) continue
          }
          if (hostileApproachRef.current.get(e.id) === 'no-engage') continue
          const ecEnc = entityCenter(e)
          if (distSq(x, y, ecEnc.x, ecEnc.y) < PLAYER_INTERACT_RADIUS_SQ) {
            setWeaponFeedback(null)
            setEncounterId(e.id)
            openedEncounter = true
            break
          }
        }
      }

      const zombieContactDamage = Math.round(
        MAX_HEALTH *
          (ZOMBIE_CONTACT_DAMAGE_MIN +
            Math.random() *
              (ZOMBIE_CONTACT_DAMAGE_MAX - ZOMBIE_CONTACT_DAMAGE_MIN)),
      )
      for (const e of s.entities) {
        if (e.defeated || e.kind !== 'zombie') continue
        const ec = entityCenter(e)
        if (distSq(x, y, ec.x, ec.y) >= PLAYER_INTERACT_RADIUS_SQ) continue
        if (now - lastZombieContactRef.current < ZOMBIE_CONTACT_COOLDOWN_MS)
          continue
        lastZombieContactRef.current = now
        setHealth((h) => {
          const nh = Math.max(0, h - zombieContactDamage)
          if (nh <= 0) {
            queueMicrotask(() => setPendingEndScore(scoreRef.current))
            setPlaying(false)
          }
          return nh
        })
        break
      }

      const nextHits = { ...hazardHitsRef.current }
      let radiationDamage = 0
      const rnow = Date.now()
      for (const e of s.entities) {
        if (e.defeated || e.kind !== 'radiation') continue
        const radRadius = getRadiationPulseRadius(
          e,
          rnow,
          RADIATION_PULSE_MIN,
          RADIATION_PULSE_MAX,
        )
        if (distSq(x, y, e.x + 0.5, e.y + 0.5) >= radRadius * radRadius) continue
        if (!nextHits[e.id]) {
          nextHits[e.id] = true
          radiationDamage += RADIATION_DAMAGE
        }
      }
      if (radiationDamage > 0) {
        hazardHitsRef.current = nextHits
        setHealth((h) => {
          const nh = Math.max(0, h - radiationDamage)
          if (nh <= 0) {
            queueMicrotask(() => setPendingEndScore(scoreRef.current))
            setPlaying(false)
          }
          return nh
        })
      }

      const pickedIds = new Set()
      let healAmt = 0
      let weaponAmt = 0
      for (const e of s.entities) {
        if (e.defeated || e.kind !== 'pickup') continue
        const ec = entityCenter(e)
        if (distSq(x, y, ec.x, ec.y) < PLAYER_INTERACT_RADIUS_SQ) {
          pickedIds.add(e.id)
          if (e.pickupType === 'health') {
            healAmt += HEALTH_PICKUP_AMOUNT
          } else if (e.pickupType === 'weapon') {
            weaponAmt += 1
          }
        }
      }
      if (pickedIds.size > 0) {
        setEntities((list) =>
          list.map((e) =>
            pickedIds.has(e.id) ? { ...e, defeated: true } : e,
          ),
        )
        if (healAmt > 0) {
          const threshold = MAX_HEALTH * HEALTH_PACK_AUTO_USE_THRESHOLD
          if (s.health < threshold) {
            setHealth((h) => Math.min(MAX_HEALTH, h + healAmt))
          } else {
            setHealthPacks((hp) =>
              hp + Math.floor(healAmt / HEALTH_PICKUP_AMOUNT),
            )
          }
        }
        if (weaponAmt > 0) {
          setWeapons((w) => w + weaponAmt)
        }
      }

      let onHouse = false
      for (const e of s.entities) {
        if (e.defeated || e.kind !== 'house') continue
        if (distSqToTileCenter(x, y, e.x, e.y) < PLAYER_INTERACT_RADIUS_SQ) {
          onHouse = true
          break
        }
      }
      if (onHouse) {
        setHealth((h) =>
          Math.min(MAX_HEALTH, h + HOUSE_HEAL_PER_SEC * dt),
        )
      }

      simPosRef.current = { x, y }
      setPlayer({ x, y })
      setRevealed((prev) =>
        expandVision(
          prev,
          Math.floor(x),
          Math.floor(y),
          VISION_RADIUS,
          s.cols,
          s.rows,
        ),
      )

      if (exitReachedRef.current || openedEncounter) return

      const s2 = snapRef.current
      if (s2.playing && !s2.encounterId) {
        raf = window.requestAnimationFrame(loop)
      }
    }

    raf = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(raf)
  }, [playing, encounterId])

  const submitEncounterAnswer = useCallback(
    (optionIndex) => {
      if (!encounterEntity || !encounterScenario || !playing) return

      setWeaponFeedback(null)
      const correct = optionIndex === encounterScenario.correctIndex
      if (correct) {
        const pts = pointsForAnswer(true)
        setScore((s) => applyScoreDelta(s, pts))
        if (encounterEntity.kind === 'trader') {
          setEncounterStep('reward')
          return
        }
        setZombiesKilled((z) => z + 1)
        setEntities((list) =>
          list.map((e) =>
            e.id === encounterEntity.id ? { ...e, defeated: true } : e,
          ),
        )
        setEncounterId(null)
        setEncounterStep('question')
        return
      }

      setHealth((h) => {
        const nh = Math.max(0, h - WRONG_ANSWER_DAMAGE)
        if (nh <= 0) {
          queueMicrotask(() => setPendingEndScore(scoreRef.current))
          setPlaying(false)
        }
        return nh
      })
    },
    [encounterEntity, encounterScenario, playing],
  )

  const pickTraderReward = useCallback(
    (choice) => {
      if (!encounterEntity || encounterEntity.kind !== 'trader' || !playing)
        return
      if (choice === 'ammo') {
        setWeapons((w) => w + TRADER_AMMO_REWARD)
      } else if (choice === 'health') {
        setHealthPacks((hp) => hp + TRADER_HEALTH_PACK_REWARD)
      }
      setEntities((list) =>
        list.map((e) =>
          e.id === encounterEntity.id ? { ...e, traded: true } : e,
        ),
      )
      setEncounterId(null)
      setEncounterStep('question')
    },
    [encounterEntity, playing],
  )

  const healthPacksRef = useRef(0)
  useEffect(() => {
    healthPacksRef.current = healthPacks
  }, [healthPacks])

  const useHealthPack = useCallback(() => {
    if (!playing) return
    if (healthPacksRef.current <= 0) return
    setHealthPacks((hp) => Math.max(0, hp - 1))
    setHealth((h) => Math.min(MAX_HEALTH, h + HEALTH_PICKUP_AMOUNT))
  }, [playing])

  const tryWeaponOnEncounter = useCallback(() => {
    if (!encounterEntity || !playing) return
    if (weaponsRef.current <= 0) return

    setWeaponFeedback(null)
    setWeapons((w) => Math.max(0, w - 1))
    const hit = Math.random() < WEAPON_KILL_CHANCE
    if (hit && encounterEntity.kind === 'zombie') {
      const id = encounterEntity.id
      setZombiesKilled((z) => z + 1)
      setScore((s) => applyScoreDelta(s, WEAPON_KILL_SCORE))
      setEntities((list) =>
        list.map((e) => (e.id === id ? { ...e, defeated: true } : e)),
      )
      setEncounterId(null)
      setEncounterStep('question')
    } else if (hit && encounterEntity.kind === 'trader') {
      setEntities((list) =>
        list.map((e) =>
          e.id === encounterEntity.id
            ? { ...e, angryUntil: Date.now() + TRADER_ANGRY_DURATION_MS }
            : e,
        ),
      )
      setEncounterId(null)
      setEncounterStep('question')
    } else {
      setWeaponFeedback('miss')
      setHealth((h) => {
        const nh = Math.max(0, h - WEAPON_MISS_DAMAGE)
        if (nh <= 0) {
          queueMicrotask(() => setPendingEndScore(scoreRef.current))
          setPlaying(false)
        }
        return nh
      })
    }
  }, [encounterEntity, playing])

  const fireRangedWeapon = useCallback(() => {
    if (!snapRef.current.playing || snapRef.current.encounterId) return
    if (weaponsRef.current <= 0) return

    const s = snapRef.current
    const px = simPosRef.current.x
    const py = simPosRef.current.y
    let dx = lastMoveDirRef.current.x
    let dy = lastMoveDirRef.current.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) {
      dx = 0
      dy = 1
    } else {
      dx /= len
      dy /= len
    }

    setProjectile({ dx, dy })
    if (projectileClearRef.current) clearTimeout(projectileClearRef.current)
    projectileClearRef.current = setTimeout(() => {
      setProjectile(null)
      projectileClearRef.current = null
    }, PROJECTILE_FLIGHT_MS)

    setWeapons((w) => Math.max(0, w - 1))
    let hitTarget = null

    for (let i = 1; i <= RANGED_SHOT_RANGE; i++) {
      const tx = Math.floor(px + dx * i)
      const ty = Math.floor(py + dy * i)
      if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) break

      const key = cellKey(tx, ty)
      if (s.wallSet.has(key)) break

      const hostile = s.entities.find(
        (e) =>
          !e.defeated &&
          (e.kind === 'zombie' || e.kind === 'trader') &&
          Math.floor(e.x) === tx &&
          Math.floor(e.y) === ty,
      )
      if (hostile) {
        hitTarget = { id: hostile.id, kind: hostile.kind }
        break
      }
    }

    if (hitTarget) {
      const { id: idToDefeat, kind } = hitTarget
      setTimeout(() => {
        if (kind === 'zombie') {
          setZombiesKilled((z) => z + 1)
          setScore((sc) => applyScoreDelta(sc, WEAPON_KILL_SCORE))
          setEntities((list) =>
            list.map((e) =>
              e.id === idToDefeat ? { ...e, defeated: true } : e,
            ),
          )
        } else {
          setEntities((list) =>
            list.map((e) =>
              e.id === idToDefeat
                ? {
                    ...e,
                    angryUntil: Date.now() + TRADER_ANGRY_DURATION_MS,
                  }
                : e,
            ),
          )
        }
      }, PROJECTILE_FLIGHT_MS)
    }
  }, [])

  return {
    MAP_COLS: mapCols,
    MAP_ROWS: mapRows,
    VIEWPORT_COLS,
    VIEWPORT_ROWS,
    wallSet,
    pathSet,
    revealed,
    player,
    entities,
    projectile,
    hostileProjectile,
    health,
    weapons,
    healthPacks,
    weaponFeedback,
    score,
    playing,
    encounterId,
    encounterEntity,
    encounterScenario,
    encounterStep,
    encounterTotal: encounterQuota,
    pickTraderReward,
    zombiesKilled,
    zombiesToEliminate: ZOMBIES_TO_ELIMINATE,
    exitBlocked,
    encountersCleared,
    pendingEndScore,
    moveKeysRef,
    touchAnalogRef,
    submitEncounterAnswer,
    tryWeaponOnEncounter,
    fireRangedWeapon,
    useHealthPack,
    startGame,
    reset,
    stopGame,
    clearPendingEnd,
    exitCell,
    spawnCell,
  }
}

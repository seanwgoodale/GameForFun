import {
  ENTITY_MIN_TILES_PER_DIR,
  GLOWER_FRACTION,
  RUNNER_FRACTION,
  SCREAMER_FRACTION,
  RADIATION_PULSE_GROW_MAX,
  RADIATION_PULSE_GROW_MIN,
  RADIATION_PULSE_REST_MAX,
  RADIATION_PULSE_REST_MIN,
  RADIATION_PULSE_SHRINK_MAX,
  RADIATION_PULSE_SHRINK_MIN,
} from '../utils/constants.js'
import { cellKey } from '../utils/helpers.js'
import {
  hostileEncounterIds,
  traderEncounterIds,
} from '../data/encounters.js'

/** @typedef {'radiation' | 'zombie' | 'trader' | 'pickup' | 'house'} EntityKind */
/** @typedef {'health' | 'weapon'} PickupType */
/** @typedef {{ id: string; kind: EntityKind; x: number; y: number; scenarioId?: string; defeated?: boolean; pickupType?: PickupType }} MapEntity */

/** Seed-deterministic encounter draw, themed to the entity kind. */
function pickEncounterId(kind, rand) {
  const pool = kind === 'trader' ? traderEncounterIds : hostileEncounterIds
  return pool[Math.floor(rand() * pool.length)]
}

/** @returns {'shambler' | 'runner' | 'screamer' | 'glower'} */
function pickArchetype(rand) {
  const r = rand()
  if (r < RUNNER_FRACTION) return 'runner'
  if (r < RUNNER_FRACTION + SCREAMER_FRACTION) return 'screamer'
  if (r < RUNNER_FRACTION + SCREAMER_FRACTION + GLOWER_FRACTION) return 'glower'
  return 'shambler'
}

/** @param {number} seed */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @template T
 * @param {T[]} arr
 * @param {() => number} rand
 */
function shuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** NW=0, NE=1, SW=2, SE=3 by world midlines (interior tiles). */
function quadrantIndex(x, y, cols, rows) {
  const mx = Math.floor(cols / 2)
  const my = Math.floor(rows / 2)
  const east = x >= mx ? 1 : 0
  const south = y >= my ? 2 : 0
  return east + south
}

/**
 * @param {string[]} keys
 * @param {number} cols
 * @param {number} rows
 * @param {() => number} rand
 * @returns {string[][]}
 */
function partitionKeysByQuadrant(keys, cols, rows, rand) {
  /** @type {string[][]} */
  const q = [[], [], [], []]
  for (const k of keys) {
    const [x, y] = k.split(',').map(Number)
    q[quadrantIndex(x, y, cols, rows)].push(k)
  }
  for (let i = 0; i < 4; i++) shuffle(q[i], rand)
  return q
}

/**
 * Take up to `count` keys, round-robin across quadrants so spawns spread geographically.
 * @param {string[][]} buckets
 * @param {number} count
 * @param {() => number} rand
 */
function takeRoundRobinFromBuckets(buckets, count, rand) {
  const order = shuffle([0, 1, 2, 3], rand)
  const out = []
  let spins = 0
  const maxSpins = count * 8 + 32
  while (out.length < count && spins < maxSpins) {
    let progressed = false
    for (const bi of order) {
      if (out.length >= count) break
      const b = buckets[bi]
      if (b.length) {
        out.push(b.pop())
        progressed = true
      }
    }
    if (!progressed) break
    spins++
  }
  if (out.length < count) {
    const rest = buckets.flat()
    shuffle(rest, rand)
    const have = new Set(out)
    for (const k of rest) {
      if (out.length >= count) break
      if (!have.has(k)) {
        have.add(k)
        out.push(k)
      }
    }
  }
  return out
}

/**
 * Pick `n` floor keys maximizing spread (farthest-first / max–min distance).
 * @param {string[]} candidateKeys
 * @param {number} n
 * @param {() => number} rand
 * @returns {string[] | null}
 */
function pickSpreadKeys(candidateKeys, n, rand) {
  const pool = shuffle([...candidateKeys], rand)
  if (pool.length < n) return null
  /** @type {string[]} */
  const chosen = []
  const taken = new Set()
  const first = pool[Math.floor(rand() * pool.length)]
  chosen.push(first)
  taken.add(first)
  while (chosen.length < n) {
    let best = null
    let bestMin = -1
    for (const k of pool) {
      if (taken.has(k)) continue
      const [x, y] = k.split(',').map(Number)
      let minD = 1e9
      for (const c of chosen) {
        const [cx, cy] = c.split(',').map(Number)
        minD = Math.min(minD, Math.abs(x - cx) + Math.abs(y - cy))
      }
      if (minD > bestMin || (minD === bestMin && rand() < 0.5)) {
        bestMin = minD
        best = k
      }
    }
    if (best == null) return null
    chosen.push(best)
    taken.add(best)
  }
  return chosen
}

/**
 * Place radiation in multi-tile clusters (BFS blobs of 2–5 cells) for hotspot feel.
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {string[]} candidateKeys
 * @param {number} total
 * @param {Set<string>} usedKeys
 * @param {number} seed
 * @param {() => number} rand
 * @returns {MapEntity[] | null}
 */
function placeRadiationClusters(
  wallSet,
  cols,
  rows,
  candidateKeys,
  total,
  usedKeys,
  seed,
  rand,
) {
  const poolSet = new Set(
    candidateKeys.filter((k) => !usedKeys.has(k)),
  )
  /** @type {MapEntity[]} */
  const out = []
  let left = total
  let id = 0
  while (left > 0 && poolSet.size > 0) {
    const targetSize = Math.min(left, 2 + Math.floor(rand() * 4))
    const poolArr = [...poolSet]
    const seedKey = poolArr[Math.floor(rand() * poolArr.length)]
    const cluster = new Set([seedKey])
    const q = [seedKey]
    while (cluster.size < targetSize && q.length > 0) {
      const cur = q.shift()
      const neigh = shuffle(
        walkNeighbors(wallSet, cols, rows, cur),
        rand,
      )
      for (const nk of neigh) {
        if (!poolSet.has(nk) || cluster.has(nk)) continue
        cluster.add(nk)
        q.push(nk)
        if (cluster.size >= targetSize) break
      }
    }
    for (const k of cluster) {
      if (left <= 0) break
      poolSet.delete(k)
      usedKeys.add(k)
      const [x, y] = k.split(',').map(Number)
      const cycle =
        (RADIATION_PULSE_GROW_MAX - RADIATION_PULSE_GROW_MIN) * rand() +
        RADIATION_PULSE_GROW_MIN +
        (RADIATION_PULSE_SHRINK_MAX - RADIATION_PULSE_SHRINK_MIN) * rand() +
        RADIATION_PULSE_SHRINK_MIN +
        (RADIATION_PULSE_REST_MAX - RADIATION_PULSE_REST_MIN) * rand() +
        RADIATION_PULSE_REST_MIN
      out.push({
        id: `r-${seed}-${id++}`,
        kind: 'radiation',
        x,
        y,
        pulseGrowMs:
          RADIATION_PULSE_GROW_MIN +
          rand() * (RADIATION_PULSE_GROW_MAX - RADIATION_PULSE_GROW_MIN),
        pulseShrinkMs:
          RADIATION_PULSE_SHRINK_MIN +
          rand() * (RADIATION_PULSE_SHRINK_MAX - RADIATION_PULSE_SHRINK_MIN),
        pulseRestMs:
          RADIATION_PULSE_REST_MIN +
          rand() * (RADIATION_PULSE_REST_MAX - RADIATION_PULSE_REST_MIN),
        pulseOffsetMs: rand() * cycle,
      })
      left--
    }
  }
  return left === 0 ? out : null
}

/**
 * If we add `candidate` to paths, would any (2r+1)² window exceed `maxPathFrac` path density?
 * Grass must stay ≥ (1 - maxPathFrac) in every local window (default 80% grass → max 20% path).
 */
function wouldExceedLocalPathFrac(
  pathSet,
  wallSet,
  cols,
  rows,
  candidate,
  maxPathFrac,
  radius,
) {
  const [ax, ay] = candidate.split(',').map(Number)
  let pathCount = 0
  let floorCount = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = ax + dx
      const ny = ay + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
      const nk = cellKey(nx, ny)
      if (wallSet.has(nk)) continue
      floorCount++
      const onPath = pathSet.has(nk) || nk === candidate
      if (onPath) pathCount++
    }
  }
  if (floorCount < 5) return false
  return pathCount / floorCount > maxPathFrac
}

/**
 * Valid 4-neighbors on walkable floor.
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {string} k
 */
function walkNeighbors(wallSet, cols, rows, k) {
  const [x, y] = k.split(',').map(Number)
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]
  /** @type {string[]} */
  const out = []
  for (const [dx, dy] of dirs) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
    const nk = cellKey(nx, ny)
    if (!wallSet.has(nk)) out.push(nk)
  }
  return out
}

/**
 * Windy meander from `fromK` toward `toK` using biased random steps + local path-density cap.
 * @param {() => number} rand
 */
function windyMeander(
  wallSet,
  cols,
  rows,
  pathSet,
  fromK,
  toK,
  maxPathGlobal,
  rand,
  maxPathFrac = 0.2,
  winRadius = 3,
) {
  const maxSteps = Math.min(
    220,
    Math.max(24, Math.ceil(2.8 * manhattanKey(fromK, toK))),
  )
  let cur = fromK
  let steps = 0
  const recent = []
  const recentCap = 10

  function manhattanToGoal(k) {
    return manhattanKey(k, toK)
  }

  while (steps < maxSteps && cur !== toK && pathSet.size < maxPathGlobal) {
    const neigh = walkNeighbors(wallSet, cols, rows, cur)
    if (!neigh.length) break

    /** @type {string[]} */
    let pickPool
    if (rand() < 0.42) {
      pickPool = shuffle([...neigh], rand)
    } else {
      neigh.sort(
        (a, b) => manhattanToGoal(a) - manhattanToGoal(b) || (rand() - 0.5),
      )
      const bestD = manhattanToGoal(neigh[0])
      pickPool = neigh.filter((n) => manhattanToGoal(n) <= bestD + 1)
      shuffle(pickPool, rand)
    }

    let next = null
    for (const nk of pickPool) {
      if (recent.includes(nk)) continue
      if (wouldExceedLocalPathFrac(
        pathSet,
        wallSet,
        cols,
        rows,
        nk,
        maxPathFrac,
        winRadius,
      ))
        continue
      next = nk
      break
    }
    if (!next) {
      for (const nk of shuffle([...neigh], rand)) {
        if (wouldExceedLocalPathFrac(
          pathSet,
          wallSet,
          cols,
          rows,
          nk,
          maxPathFrac,
          winRadius,
        ))
          continue
        next = nk
        break
      }
    }
    if (!next) break

    pathSet.add(next)
    recent.push(next)
    if (recent.length > recentCap) recent.shift()
    cur = next
    steps++
  }
}

function manhattanKey(a, b) {
  const [ax, ay] = a.split(',').map(Number)
  const [bx, by] = b.split(',').map(Number)
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/**
 * ~15–20% of walkable floor as winding dirt trails; every local window keeps path ≤20% (grass ≥80%).
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {MapEntity[]} entities
 * @param {{ x: number; y: number }} exitCell
 * @param {{ x: number; y: number }} playerStart
 * @param {() => number} rand
 */
function buildPathSet(
  wallSet,
  cols,
  rows,
  entities,
  exitCell,
  playerStart,
  rand,
) {
  const pathSet = new Set()
  /** @type {string[]} */
  const poiKeys = []
  for (const e of entities) {
    if (e.kind === 'house') poiKeys.push(cellKey(e.x, e.y))
    if (e.kind === 'pickup' && e.pickupType === 'health')
      poiKeys.push(cellKey(e.x, e.y))
  }
  poiKeys.push(cellKey(exitCell.x, exitCell.y))

  let floorCount = 0
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (!wallSet.has(cellKey(x, y))) floorCount++
    }
  }

  const fracHi = 0.15 + rand() * 0.05
  const maxPathGlobal = Math.max(12, Math.floor(floorCount * fracHi))

  const startKey = cellKey(playerStart.x, playerStart.y)
  if (
    !wouldExceedLocalPathFrac(
      pathSet,
      wallSet,
      cols,
      rows,
      startKey,
      0.2,
      3,
    )
  ) {
    pathSet.add(startKey)
  }

  const order = shuffle([...new Set(poiKeys)], rand)
  let cursor = startKey
  for (const tk of order) {
    if (pathSet.size >= maxPathGlobal) break
    windyMeander(
      wallSet,
      cols,
      rows,
      pathSet,
      cursor,
      tk,
      maxPathGlobal,
      rand,
    )
    cursor = tk
  }

  const floorList = []
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const k = cellKey(x, y)
      if (!wallSet.has(k)) floorList.push(k)
    }
  }
  shuffle(floorList, rand)
  const spurAttempts = Math.min(4, Math.max(2, Math.floor(order.length / 5)))
  for (let s = 0; s < spurAttempts && pathSet.size < maxPathGlobal; s++) {
    const a = floorList[Math.floor(rand() * floorList.length)]
    const t = order[Math.floor(rand() * order.length)] ?? startKey
    windyMeander(wallSet, cols, rows, pathSet, a, t, maxPathGlobal, rand)
  }

  /** Trim if a rare overshoot slipped through */
  if (pathSet.size > maxPathGlobal) {
    const excess = shuffle([...pathSet], rand)
    let i = 0
    while (pathSet.size > maxPathGlobal && i < excess.length) {
      const k = excess[i++]
      if (k !== startKey) pathSet.delete(k)
    }
  }

  return pathSet
}

/** Chebyshev distance from spawn tile (integer grid). */
function chebyshevFromSpawn(tx, ty, sx, sy) {
  return Math.max(Math.abs(tx - sx), Math.abs(ty - sy))
}

/**
 * Two reachable floor tiles next to the helipad: one zombie, one trader.
 * Prefers 4-way neighbors, then diagonals.
 * @param {Map<string, number>} dist
 * @param {{ x: number; y: number }} exitCell
 * @param {string} startKey
 * @param {() => number} rand
 * @returns {[string, string] | null}
 */
function pickHelipadGuardKeys(dist, exitCell, startKey, rand) {
  const { x: ex, y: ey } = exitCell
  const ortho = [
    [ex - 1, ey],
    [ex + 1, ey],
    [ex, ey - 1],
    [ex, ey + 1],
  ]
  /** @type {string[]} */
  const orthoKeys = []
  for (const [x, y] of ortho) {
    const k = cellKey(x, y)
    if (dist.has(k) && k !== startKey) orthoKeys.push(k)
  }
  shuffle(orthoKeys, rand)
  /** @type {string[]} */
  let keys = [...orthoKeys]
  if (keys.length < 2) {
    const diag = [
      [ex - 1, ey - 1],
      [ex + 1, ey - 1],
      [ex - 1, ey + 1],
      [ex + 1, ey + 1],
    ]
    for (const [x, y] of diag) {
      const k = cellKey(x, y)
      if (!dist.has(k) || k === startKey || keys.includes(k)) continue
      keys.push(k)
    }
    shuffle(keys, rand)
  }
  if (keys.length < 2) return null
  return [keys[0], keys[1]]
}

/**
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {number} sx
 * @param {number} sy
 */
function bfsDistances(wallSet, cols, rows, sx, sy) {
  /** @type {Map<string, number>} */
  const dist = new Map()
  const start = cellKey(sx, sy)
  if (wallSet.has(start)) return dist
  const q = [[sx, sy, 0]]
  const seen = new Set([start])
  dist.set(start, 0)
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]
  while (q.length) {
    const [x, y, d] = q.shift()
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
      const k = cellKey(nx, ny)
      if (wallSet.has(k) || seen.has(k)) continue
      seen.add(k)
      dist.set(k, d + 1)
      q.push([nx, ny, d + 1])
    }
  }
  return dist
}

/**
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {number} sx
 * @param {number} sy
 */
function countReachable(wallSet, cols, rows, sx, sy) {
  return bfsDistances(wallSet, cols, rows, sx, sy).size
}

/**
 * @param {{
 *   cols: number
 *   rows: number
 *   wallProbability?: number
 *   numZombies?: number
 *   numTraders?: number
 *   numRadiation?: number
 *   numHealthPickups?: number
 *   numWeaponPickups?: number
 *   seed?: number
 * }} params
 * @returns {{
 *   wallSet: Set<string>
 *   cols: number
 *   rows: number
 *   playerStart: { x: number; y: number }
 *   exitCell: { x: number; y: number }
 *   entities: MapEntity[]
 *   pathSet: Set<string>
 * }}
 */
export function generateLevel(params) {
  const {
    cols,
    rows,
    wallProbability = 0.035,
    // Direct counts — callers pass a DIFFICULTIES preset; defaults = survivor.
    numZombies = 90,
    numTraders = 6,
    numRadiation = 46,
    numHealthPickups = 60,
    numWeaponPickups = 30,
    seed = (Date.now() ^ (Math.floor(Math.random() * 0xffffffff) >>> 0)) >>> 0,
  } = params

  const rand = mulberry32(seed >>> 0)

  /** Biome is cosmetic (renderer palettes) but part of the seed's identity. */
  const biomes = ['scrub', 'ashfall', 'saltflat', 'overgrowth']
  const biome = biomes[Math.floor(rand() * biomes.length)]

  const effZombies = Math.max(1, Math.round(numZombies))
  const effTraders = Math.max(0, Math.round(numTraders))
  const effRadiation = Math.max(1, Math.round(numRadiation))

  const interior = (cols - 2) * (rows - 2)
  const numHouses = Math.max(4, Math.min(14, Math.floor(interior / 500)))

  const minReachLarge = Math.max(4000, Math.floor(interior * 0.062))
  const minReach =
    interior >= 12000
      ? Math.min(interior - 64, minReachLarge)
      : Math.min(
          interior - 64,
          Math.max(
            Math.floor(interior * 0.42),
            Math.floor(interior * 0.062),
          ),
        )

  const playerStart = { x: 1, y: 1 }

  for (let attempt = 0; attempt < 160; attempt++) {
    const wallSet = new Set()
    for (let x = 0; x < cols; x++) {
      wallSet.add(cellKey(x, 0))
      wallSet.add(cellKey(x, rows - 1))
    }
    for (let y = 0; y < rows; y++) {
      wallSet.add(cellKey(0, y))
      wallSet.add(cellKey(cols - 1, y))
    }

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (x === playerStart.x && y === playerStart.y) continue
        if (rand() < wallProbability) wallSet.add(cellKey(x, y))
      }
    }

    wallSet.delete(cellKey(playerStart.x, playerStart.y))

    const reachableCount = countReachable(
      wallSet,
      cols,
      rows,
      playerStart.x,
      playerStart.y,
    )
    if (reachableCount < minReach) continue

    const dist = bfsDistances(
      wallSet,
      cols,
      rows,
      playerStart.x,
      playerStart.y,
    )
    const startKey = cellKey(playerStart.x, playerStart.y)
    const minExitWalk = Math.min(100, Math.max(48, Math.floor((cols + rows) / 12)))
    /** @type {string[]} */
    const exitCandidates = []
    for (const [k, d] of dist) {
      if (k === startKey) continue
      if (d >= minExitWalk) exitCandidates.push(k)
    }
    if (!exitCandidates.length) continue
    shuffle(exitCandidates, rand)
    const exitKey = exitCandidates[Math.floor(rand() * exitCandidates.length)]

    const [ex, ey] = exitKey.split(',').map(Number)
    const exitCell = { x: ex, y: ey }

    const helipadGuards = pickHelipadGuardKeys(dist, exitCell, startKey, rand)
    if (!helipadGuards) continue
    const [helipadZombieKey, helipadTraderKey] = helipadGuards

    const floorKeys = [...dist.keys()].filter(
      (k) => k !== startKey && k !== exitKey,
    )
    shuffle(floorKeys, rand)

    /** Hostiles avoid spawn corner; scale clearance down on small worlds */
    const hostileClearanceTiles = Math.max(
      10,
      Math.min(44, Math.floor(Math.min(cols, rows) / 4)),
    )
    const helipadGuardSet = new Set([helipadZombieKey, helipadTraderKey])
    const hostilePool = floorKeys.filter((k) => {
      if (helipadGuardSet.has(k)) return false
      const [x, y] = k.split(',').map(Number)
      return (
        chebyshevFromSpawn(x, y, playerStart.x, playerStart.y) >=
        hostileClearanceTiles
      )
    })

    /** Helipad ring: 1 zombie + 1 trader; remaining hostiles from pool */
    const effectiveHostileCount = effZombies + Math.max(1, effTraders)
    const hostileSlotsFromPool =
      Math.max(0, effZombies - 1) + Math.max(0, effTraders - 1)
    const clutterNeed =
      effRadiation + numHealthPickups + numWeaponPickups + numHouses
    if (hostilePool.length < hostileSlotsFromPool) continue
    if (floorKeys.length < effectiveHostileCount + clutterNeed + 64) continue

    /** @type {MapEntity[]} */
    const entities = []
    const usedKeys = new Set([helipadZombieKey, helipadTraderKey])

    const hostileBuckets = partitionKeysByQuadrant(
      [...hostilePool],
      cols,
      rows,
      rand,
    )
    const zombieKeys = takeRoundRobinFromBuckets(
      hostileBuckets,
      Math.max(0, effZombies - 1),
      rand,
    )
    const traderKeys = takeRoundRobinFromBuckets(
      hostileBuckets,
      Math.max(0, effTraders - 1),
      rand,
    )
    if (zombieKeys.length < effZombies - 1 || traderKeys.length < effTraders - 1)
      continue

    const initHostileDir = (rand) => {
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]
      const d = dirs[Math.floor(rand() * 4)]
      return {
        moveDirX: d[0],
        moveDirY: d[1],
        tilesLeftInDir:
          ENTITY_MIN_TILES_PER_DIR + Math.floor(rand() * 3),
      }
    }
    for (let i = 0; i < effZombies; i++) {
      const k = i === 0 ? helipadZombieKey : zombieKeys[i - 1]
      usedKeys.add(k)
      const [x, y] = k.split(',').map(Number)
      const dir = initHostileDir(rand)
      entities.push({
        id: `z-${seed}-${i}`,
        kind: 'zombie',
        archetype: pickArchetype(rand),
        x: x + 0.5,
        y: y + 0.5,
        ...dir,
        scenarioId: pickEncounterId('zombie', rand),
      })
    }
    for (let i = 0; i < effTraders; i++) {
      const k = i === 0 ? helipadTraderKey : traderKeys[i - 1]
      usedKeys.add(k)
      const [x, y] = k.split(',').map(Number)
      const dir = initHostileDir(rand)
      entities.push({
        id: `t-${seed}-${i}`,
        kind: 'trader',
        x: x + 0.5,
        y: y + 0.5,
        ...dir,
        scenarioId: pickEncounterId('trader', rand),
      })
    }
    if (effTraders === 0) {
      const [tx, ty] = helipadTraderKey.split(',').map(Number)
      const dir = initHostileDir(rand)
      entities.push({
        id: `t-helipad-${seed}`,
        kind: 'trader',
        x: tx + 0.5,
        y: ty + 0.5,
        ...dir,
        scenarioId: pickEncounterId('trader', rand),
      })
    }

    const restAfterHostiles = floorKeys.filter((k) => !usedKeys.has(k))
    if (restAfterHostiles.length < clutterNeed) continue
    const houseBuckets = partitionKeysByQuadrant(
      restAfterHostiles,
      cols,
      rows,
      rand,
    )
    const houseKeys = takeRoundRobinFromBuckets(
      houseBuckets,
      numHouses,
      rand,
    )
    if (houseKeys.length < numHouses) continue
    for (const k of houseKeys) usedKeys.add(k)
    for (let i = 0; i < numHouses; i++) {
      const k = houseKeys[i]
      const [x, y] = k.split(',').map(Number)
      entities.push({
        id: `house-${seed}-${i}`,
        kind: 'house',
        x,
        y,
      })
    }

    let restPool = floorKeys.filter((k) => !usedKeys.has(k))
    const clutterSubNeed =
      effRadiation + numHealthPickups + numWeaponPickups
    if (restPool.length < clutterSubNeed) continue

    // Radiation keeps clear of the vault door: no first-second dose at spawn.
    const radClearance = 10
    const radPool = restPool.filter((k) => {
      const [x, y] = k.split(',').map(Number)
      return (
        chebyshevFromSpawn(x, y, playerStart.x, playerStart.y) >= radClearance
      )
    })
    const radEntities = placeRadiationClusters(
      wallSet,
      cols,
      rows,
      radPool,
      effRadiation,
      usedKeys,
      seed,
      rand,
    )
    if (!radEntities) continue
    for (const e of radEntities) entities.push(e)

    restPool = floorKeys.filter((k) => !usedKeys.has(k))
    const healthKeys = pickSpreadKeys(restPool, numHealthPickups, rand)
    if (!healthKeys) continue
    for (const k of healthKeys) usedKeys.add(k)
    for (let i = 0; i < numHealthPickups; i++) {
      const k = healthKeys[i]
      const [x, y] = k.split(',').map(Number)
      entities.push({
        id: `h-${seed}-${i}`,
        kind: 'pickup',
        pickupType: 'health',
        x,
        y,
      })
    }

    restPool = floorKeys.filter((k) => !usedKeys.has(k))
    const weaponKeys = pickSpreadKeys(restPool, numWeaponPickups, rand)
    if (!weaponKeys) continue
    for (const k of weaponKeys) usedKeys.add(k)
    for (let i = 0; i < numWeaponPickups; i++) {
      const k = weaponKeys[i]
      const [x, y] = k.split(',').map(Number)
      entities.push({
        id: `w-${seed}-${i}`,
        kind: 'pickup',
        pickupType: 'weapon',
        x,
        y,
      })
    }

    restPool = floorKeys.filter((k) => !usedKeys.has(k))
    const troveCandidates = restPool.filter((k) => {
      const neigh = walkNeighbors(wallSet, cols, rows, k)
      return neigh.length >= 3
    })
    if (troveCandidates.length > 0) {
      const centerKey =
        troveCandidates[Math.floor(rand() * troveCandidates.length)]
      const [cx, cy] = centerKey.split(',').map(Number)
      const neighbors = walkNeighbors(wallSet, cols, rows, centerKey).filter(
        (nk) => !usedKeys.has(nk),
      )
      if (neighbors.length >= 2) {
        usedKeys.add(centerKey)
        const hc = 2 + Math.floor(rand() * 2)
        const wc = 2 + Math.floor(rand() * 2)
        for (let i = 0; i < hc; i++) {
          entities.push({
            id: `trove-h-${seed}-${i}`,
            kind: 'pickup',
            pickupType: 'health',
            x: cx,
            y: cy,
          })
        }
        for (let i = 0; i < wc; i++) {
          entities.push({
            id: `trove-w-${seed}-${i}`,
            kind: 'pickup',
            pickupType: 'weapon',
            x: cx,
            y: cy,
          })
        }
        const useZombies = rand() < 0.5
        const guardCount = Math.min(neighbors.length, 2 + Math.floor(rand() * 2))
        shuffle(neighbors, rand)
        for (let g = 0; g < guardCount; g++) {
          const nk = neighbors[g]
          usedKeys.add(nk)
          const [gx, gy] = nk.split(',').map(Number)
          const dir = initHostileDir(rand)
          entities.push({
            id: `trove-${useZombies ? 'z' : 't'}-${seed}-${g}`,
            kind: useZombies ? 'zombie' : 'trader',
            ...(useZombies ? { archetype: pickArchetype(rand) } : {}),
            x: gx + 0.5,
            y: gy + 0.5,
            ...dir,
            scenarioId: pickEncounterId(useZombies ? 'zombie' : 'trader', rand),
          })
        }
      }
    }

    const pathSet = buildPathSet(
      wallSet,
      cols,
      rows,
      entities,
      exitCell,
      playerStart,
      rand,
    )
    for (const k of pathSet) wallSet.delete(k)

    return {
      wallSet,
      cols,
      rows,
      playerStart: { ...playerStart },
      exitCell,
      entities,
      pathSet,
      biome,
    }
  }

  // Fallback: sparse walls if randomness fails (should be rare)
  const wallSet = new Set()
  for (let x = 0; x < cols; x++) {
    wallSet.add(cellKey(x, 0))
    wallSet.add(cellKey(x, rows - 1))
  }
  for (let y = 0; y < rows; y++) {
    wallSet.add(cellKey(0, y))
    wallSet.add(cellKey(cols - 1, y))
  }
  return {
    wallSet,
    cols,
    rows,
    playerStart: { ...playerStart },
    exitCell: { x: cols - 2, y: rows - 2 },
    entities: [],
    pathSet: new Set(),
    biome,
  }
}

/**
 * @param {MapEntity[]} entities
 * @param {Set<string>} wallSet
 * @param {number} cols
 * @param {number} rows
 * @param {{ x: number; y: number }} exitCell
 * @param {{ x: number; y: number }} player
 * @param {() => number} rand
 */
export function tickEntityPositions(
  entities,
  wallSet,
  cols,
  rows,
  exitCell,
  player,
  rand,
) {
  const next = entities.map((e) => ({ ...e }))
  const indices = shuffle(
    next
      .map((_, i) => i)
      .filter((i) => {
        if (next[i].defeated) return false
        // Chasers are driven smoothly by the chase system, not the wander hop.
        if (next[i].chasing) return false
        const k = next[i].kind
        return k === 'zombie' || k === 'trader'
      }),
    rand,
  )

  const occupied = new Set()
  for (let i = 0; i < next.length; i++) {
    if (!next[i].defeated) {
      const ex = next[i].x
      const ey = next[i].y
      occupied.add(
        cellKey(
          Number.isInteger(ex) ? ex : Math.floor(ex),
          Number.isInteger(ey) ? ey : Math.floor(ey),
        ),
      )
    }
  }

  for (const i of indices) {
    const e = next[i]
    if (e.kind === 'radiation') continue

    const curTx = Number.isInteger(e.x) ? e.x : Math.floor(e.x)
    const curTy = Number.isInteger(e.y) ? e.y : Math.floor(e.y)
    const cur = cellKey(curTx, curTy)
    occupied.delete(cur)

    if (e.kind === 'zombie' || e.kind === 'trader') {
      let moveDirX = e.moveDirX ?? 0
      let moveDirY = e.moveDirY ?? 0
      let tilesLeft = e.tilesLeftInDir ?? 0

      if (tilesLeft <= 0) {
        const dirs = shuffle(
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ],
          rand,
        )
        ;[moveDirX, moveDirY] = dirs[0]
        tilesLeft = ENTITY_MIN_TILES_PER_DIR + Math.floor(rand() * 3)
      }

      const tryMove = (dx, dy, newTilesLeft) => {
        const nx = curTx + dx
        const ny = curTy + dy
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false
        const nk = cellKey(nx, ny)
        if (wallSet.has(nk)) return false
        if (nx === exitCell.x && ny === exitCell.y) return false
        const ptx = Math.floor(player.x)
        const pty = Math.floor(player.y)
        if (occupied.has(nk) && !(nx === ptx && ny === pty)) return false
        next[i] = {
          ...e,
          x: nx + 0.5,
          y: ny + 0.5,
          moveDirX: dx,
          moveDirY: dy,
          tilesLeftInDir: newTilesLeft,
        }
        occupied.add(nk)
        return true
      }

      if (tryMove(moveDirX, moveDirY, tilesLeft - 1)) continue

      const alts = shuffle(
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ],
        rand,
      )
      for (const [dx, dy] of alts) {
        if (dx === moveDirX && dy === moveDirY) continue
        const newTiles = ENTITY_MIN_TILES_PER_DIR + Math.floor(rand() * 3) - 1
        if (tryMove(dx, dy, newTiles)) break
      }
    }
    occupied.add(cur)
  }

  return next
}

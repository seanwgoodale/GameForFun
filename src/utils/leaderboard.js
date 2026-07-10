/**
 * Local leaderboard: top-N entries in localStorage, migrating older single-
 * entry formats (a bare number, then `{ score, name }`) transparently.
 *
 * @typedef {{ id: string; score: number; name: string; date: string; difficulty?: string; seed?: number | null }} BoardEntry
 * @typedef {{ entries: BoardEntry[] }} Board
 */

export const BOARD_MAX_ENTRIES = 10

function makeId() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => b.score - a.score).slice(0, BOARD_MAX_ENTRIES)
}

/**
 * Coerce whatever is in storage into a Board.
 * @param {unknown} stored
 * @returns {Board}
 */
export function normalizeBoard(stored) {
  if (typeof stored === 'number' && stored > 0) {
    return { entries: [{ id: 'legacy', score: stored, name: '', date: '' }] }
  }
  if (stored && typeof stored === 'object') {
    if (Array.isArray(stored.entries)) {
      const entries = stored.entries
        .filter((e) => e && typeof e.score === 'number' && e.score > 0)
        .map((e) => ({
          id: String(e.id ?? makeId()),
          score: e.score,
          name: String(e.name ?? '').slice(0, 13),
          date: String(e.date ?? ''),
          difficulty: e.difficulty,
          seed: e.seed ?? null,
        }))
      return { entries: sortEntries(entries) }
    }
    if (typeof stored.score === 'number' && stored.score > 0) {
      return {
        entries: [
          {
            id: 'legacy',
            score: stored.score,
            name: String(stored.name ?? '').slice(0, 13),
            date: '',
          },
        ],
      }
    }
  }
  return { entries: [] }
}

/**
 * Insert a finished run. Returns the new board plus the entry's rank
 * (1-based) — or rank null if it didn't make the board.
 * @param {Board} board
 * @param {{ score: number; difficulty?: string; seed?: number | null }} run
 * @returns {{ board: Board; rank: number | null; entryId: string | null }}
 */
export function insertScore(board, run) {
  if (!run || typeof run.score !== 'number' || run.score <= 0) {
    return { board, rank: null, entryId: null }
  }
  const entry = {
    id: makeId(),
    score: run.score,
    name: '',
    date: new Date().toISOString().slice(0, 10),
    difficulty: run.difficulty,
    seed: run.seed ?? null,
  }
  const entries = sortEntries([...board.entries, entry])
  const rank = entries.findIndex((e) => e.id === entry.id)
  if (rank === -1) return { board, rank: null, entryId: null }
  return { board: { entries }, rank: rank + 1, entryId: entry.id }
}

/**
 * Attach a player name to an entry.
 * @param {Board} board
 * @param {string} entryId
 * @param {string} name
 * @returns {Board}
 */
export function nameEntry(board, entryId, name) {
  return {
    entries: board.entries.map((e) =>
      e.id === entryId ? { ...e, name: String(name ?? '').slice(0, 13) } : e,
    ),
  }
}

/** Deterministic uint32 from a string (FNV-1a) — used for daily seeds. */
export function hashSeed(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Today's shared seed: everyone gets the same wasteland on a given date. */
export function dailySeed(date = new Date()) {
  return hashSeed(`wasteland-${date.toISOString().slice(0, 10)}`)
}

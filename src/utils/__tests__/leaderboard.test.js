import { describe, expect, it } from 'vitest'
import {
  BOARD_MAX_ENTRIES,
  dailySeed,
  hashSeed,
  insertScore,
  nameEntry,
  normalizeBoard,
} from '../leaderboard.js'

describe('normalizeBoard migration', () => {
  it('migrates a bare legacy number', () => {
    expect(normalizeBoard(120).entries).toEqual([
      { id: 'legacy', score: 120, name: '', date: '' },
    ])
  })

  it('migrates the { score, name } format', () => {
    const board = normalizeBoard({ score: 88, name: 'Sean' })
    expect(board.entries).toHaveLength(1)
    expect(board.entries[0]).toMatchObject({ score: 88, name: 'Sean' })
  })

  it('passes through and sorts the new format, dropping junk', () => {
    const board = normalizeBoard({
      entries: [
        { id: 'a', score: 10, name: 'low' },
        { id: 'b', score: 90, name: 'high' },
        { id: 'c', score: 0, name: 'zero' },
        null,
      ],
    })
    expect(board.entries.map((e) => e.score)).toEqual([90, 10])
  })

  it('returns an empty board for anything else', () => {
    expect(normalizeBoard(null).entries).toEqual([])
    expect(normalizeBoard(undefined).entries).toEqual([])
    expect(normalizeBoard('garbage').entries).toEqual([])
  })
})

describe('insertScore', () => {
  it('ranks a new entry and caps the board', () => {
    let board = { entries: [] }
    for (let i = 1; i <= 12; i++) {
      board = insertScore(board, { score: i * 10 }).board
    }
    expect(board.entries).toHaveLength(BOARD_MAX_ENTRIES)
    expect(board.entries[0].score).toBe(120)
    const { rank } = insertScore(board, { score: 115 })
    expect(rank).toBe(2)
    const dud = insertScore(board, { score: 1 })
    expect(dud.rank).toBeNull()
  })

  it('rejects zero scores', () => {
    const { rank, board } = insertScore({ entries: [] }, { score: 0 })
    expect(rank).toBeNull()
    expect(board.entries).toEqual([])
  })

  it('records difficulty and seed on the entry', () => {
    const { board } = insertScore({ entries: [] }, { score: 50, difficulty: 'nightmare', seed: 42 })
    expect(board.entries[0]).toMatchObject({ difficulty: 'nightmare', seed: 42 })
  })
})

describe('nameEntry', () => {
  it('names only the matching entry, clamped to 13 chars', () => {
    const { board, entryId } = insertScore({ entries: [] }, { score: 10 })
    const named = nameEntry(board, entryId, 'A very long name indeed')
    expect(named.entries[0].name).toBe('A very long n')
  })
})

describe('seeds', () => {
  it('hashSeed is deterministic and 32-bit', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
    expect(hashSeed('abc')).toBeLessThan(2 ** 32)
  })

  it('dailySeed is stable within a date and differs across dates', () => {
    const d1 = new Date('2026-07-10T08:00:00Z')
    const d2 = new Date('2026-07-10T22:00:00Z')
    const d3 = new Date('2026-07-11T08:00:00Z')
    expect(dailySeed(d1)).toBe(dailySeed(d2))
    expect(dailySeed(d1)).not.toBe(dailySeed(d3))
  })
})

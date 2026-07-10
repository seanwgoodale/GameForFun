import { describe, expect, it } from 'vitest'
import { DEFINITIONS, PAL, SPRITE_PX } from '../sprites.js'

describe('sprite definitions', () => {
  it('every sprite is exactly 16 rows of 16 chars', () => {
    for (const [name, rows] of Object.entries(DEFINITIONS)) {
      expect(rows, `${name} row count`).toHaveLength(SPRITE_PX)
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i} width`).toBe(SPRITE_PX)
      })
    }
  })

  it('uses only palette characters or transparency', () => {
    for (const [name, rows] of Object.entries(DEFINITIONS)) {
      for (const row of rows) {
        for (const ch of row) {
          if (ch === '.') continue
          expect(PAL[ch], `${name} uses unknown char "${ch}"`).toBeDefined()
        }
      }
    }
  })

  it('full-tile ground sprites have no transparent pixels', () => {
    for (const name of ['helipad', 'vault']) {
      for (const row of DEFINITIONS[name]) {
        expect(row.includes('.'), `${name} must be opaque`).toBe(false)
      }
    }
  })
})

/**
 * Generates the PWA/social icon set from the in-repo pixel art — no image
 * tooling required. Writes PNGs (hand-rolled encoder over node:zlib) and an
 * SVG favicon into public/.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFINITIONS, PAL, SPRITE_PX } from '../src/render/sprites.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = (name) => join(root, 'public', name)

const BG = '#0c0a08'
const SPRITE = DEFINITIONS.playerS

// ── tiny PNG encoder ─────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** @param {Uint8Array} rgba flat RGBA @param {number} size square px */
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba
      .subarray(y * size * 4, (y + 1) * size * 4)
      .forEach((v, i) => (raw[y * (size * 4 + 1) + 1 + i] = v))
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── raster composition ───────────────────────────────────────────
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

/** Solid background + integer-scaled sprite, centered. */
function renderIcon(size, scale) {
  const rgba = new Uint8Array(size * size * 4)
  const [br, bg2, bb] = hex(BG)
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = br
    rgba[i * 4 + 1] = bg2
    rgba[i * 4 + 2] = bb
    rgba[i * 4 + 3] = 255
  }
  const spriteSize = SPRITE_PX * scale
  const off = Math.floor((size - spriteSize) / 2)
  for (let sy = 0; sy < SPRITE_PX; sy++) {
    for (let sx = 0; sx < SPRITE_PX; sx++) {
      const ch = SPRITE[sy][sx]
      if (ch === '.') continue
      const [r, g, b] = hex(PAL[ch])
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = off + sx * scale + dx
          const py = off + sy * scale + dy
          const i = (py * size + px) * 4
          rgba[i] = r
          rgba[i + 1] = g
          rgba[i + 2] = b
          rgba[i + 3] = 255
        }
      }
    }
  }
  return encodePng(rgba, size)
}

/** Crisp SVG of the same art (favicon). */
function renderSvg() {
  let rects = `<rect width="16" height="16" fill="${BG}"/>`
  for (let y = 0; y < SPRITE_PX; y++) {
    for (let x = 0; x < SPRITE_PX; x++) {
      const ch = SPRITE[y][x]
      if (ch === '.') continue
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[ch]}"/>`
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>\n`
}

mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(out('icon-192.png'), renderIcon(192, 10))
writeFileSync(out('icon-512.png'), renderIcon(512, 28))
writeFileSync(out('apple-touch-icon.png'), renderIcon(180, 9))
writeFileSync(out('favicon.svg'), renderSvg())
console.log('icons written: icon-192.png icon-512.png apple-touch-icon.png favicon.svg')

/**
 * Hand-authored pixel art. Every sprite is a 16×16 grid of palette characters
 * ('.' = transparent) rasterized once into offscreen canvases at boot.
 * Rendered with imageSmoothingEnabled=false so the pixels stay crisp.
 */

export const SPRITE_PX = 16

/** Shared palette — one coherent wasteland color script for every sprite. */
export const PAL = {
  k: '#181310', // outline near-black
  s: '#d9a066', // skin light
  t: '#a8703d', // skin shade
  h: '#3e2f23', // hair / dark leather
  J: '#c07f2e', // jacket amber
  j: '#8a5620', // jacket shade
  P: '#44404d', // pants slate
  b: '#2a2320', // boots
  G: '#7fa055', // zombie skin
  g: '#55703a', // zombie skin shade
  R: '#b23a3a', // blood red / cross
  C: '#6b5544', // cloak light
  c: '#4d3c2f', // cloak shade
  Y: '#ffd166', // lantern / warning yellow
  y: '#c9a227', // brass / bullets
  W: '#e8e4da', // bone white
  w: '#b9b3a4', // dirty white
  N: '#8f8a80', // stone light
  n: '#6e6a62', // stone mid
  m: '#524f49', // stone dark
  T: '#3c6b42', // canopy light
  u: '#28492e', // canopy dark
  q: '#5b4630', // trunk brown
  D: '#7a5a3a', // wood light
  d: '#5a4128', // wood dark
  O: '#8a3d2e', // roof rust
  M: '#565c66', // metal light
  e: '#3a3f47', // metal dark
  L: '#b6c93f', // rad glow
  X: '#20180f', // void seam
  F: '#9a978f', // concrete light
  f: '#7b786f', // concrete shade
}

export const DEFINITIONS = {
  playerS: [
    '................',
    '......kkkk......',
    '.....khhhhk.....',
    '.....kssssk.....',
    '.....ksksks.....',
    '.....kssssk.....',
    '......kttk......',
    '....kJJJJJJk....',
    '...kJJjJJjJJk...',
    '...sJJJJJJJJs...',
    '...kjJJJJJJjk...',
    '....kPPPPPPk....',
    '....kPPkkPPk....',
    '.....kPk.kPk....',
    '.....kbk.kbk....',
    '....kbbk.kbbk...',
  ],
  playerN: [
    '................',
    '......kkkk......',
    '.....khhhhk.....',
    '.....khhhhk.....',
    '.....khhhhk.....',
    '.....khhhhk.....',
    '......khhk......',
    '....kJJJJJJk....',
    '...kJddddddJk...',
    '...sJddddddJs...',
    '...kjddddddjk...',
    '....kPPPPPPk....',
    '....kPPkkPPk....',
    '.....kPk.kPk....',
    '.....kbk.kbk....',
    '....kbbk.kbbk...',
  ],
  playerE0: [
    '................',
    '......kkkk......',
    '.....khhhhk.....',
    '.....khsssk.....',
    '.....khsksk.....',
    '.....khsssk.....',
    '......ktsk......',
    '.....kJJJJk.....',
    '....kJJJJJjk....',
    '....kJJJJJjk....',
    '....kjJJJjjk....',
    '.....kPPPPk.....',
    '.....kPPPk......',
    '.....kPkPk......',
    '.....kbkkbk.....',
    '....kbbk.kbk....',
  ],
  playerE1: [
    '................',
    '......kkkk......',
    '.....khhhhk.....',
    '.....khsssk.....',
    '.....khsksk.....',
    '.....khsssk.....',
    '......ktsk......',
    '.....kJJJJk.....',
    '....kJJJJJjk....',
    '....kJJJJJjk....',
    '....kjJJJjjk....',
    '.....kPPPPk.....',
    '......kPPk......',
    '.....kPkPk......',
    '....kbk..kbk....',
    '...kbbk..kbbk...',
  ],
  zombie: [
    '................',
    '......kkkk......',
    '.....kGGGGk.....',
    '.....kGkGkk.....',
    '.....kGGGGk.....',
    '.....kgRGgk.....',
    '......kGgk......',
    '....kgGGGGgk....',
    '...kGGgGGgGGk...',
    '...GgkGGGGkgG...',
    '...kgGGgGGGgk...',
    '....kggkkggk....',
    '....kgk..kgk....',
    '.....kgk.kgk....',
    '.....kbk..kbk...',
    '....kbbk..kbk...',
  ],
  trader: [
    '................',
    '......kkkk......',
    '.....kCCCCk.....',
    '....kCssssCk....',
    '....kCsksksk....',
    '....kCssssCk....',
    '.....kCttCk.....',
    '....kCCCCCCk....',
    '...kCCcCCcCCk...',
    '..kDCCCCCCCCk...',
    '..kdCcCCCCcCkY..',
    '..kDCCCCCCCCkk..',
    '...kccCCCCcck...',
    '....kcCCCCck....',
    '.....kbkkbk.....',
    '....kbbk.kbbk...',
  ],
  treeA: [
    '................',
    '.......k........',
    '......kTk.......',
    '.....kTTTk......',
    '....kTTuTTk.....',
    '.....kTTTk......',
    '....kTuTTTk.....',
    '...kTTTTuTTk....',
    '....kuTTTTk.....',
    '...kTTuTTTTk....',
    '..kTTTTTuTTTk...',
    '.kuTTuTTTTTuTk..',
    '..kkkkkqqkkkk...',
    '.......kqk......',
    '......kqqqk.....',
    '.....kkkkkk.....',
  ],
  treeB: [
    '................',
    '................',
    '.......kk.......',
    '......kTTk......',
    '.....kTuTTk.....',
    '....kTTTTuTk....',
    '...kuTTuTTTTk...',
    '....kTTTTTuk....',
    '...kTuTTuTTTk...',
    '..kTTTTTTTuTTk..',
    '...kkkuTTkkkk...',
    '......kqqk......',
    '......kqqk......',
    '.....kqqqqk.....',
    '....kkkkkkk.....',
    '................',
  ],
  rockA: [
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkNNNNk.....',
    '...kNNNNNNNk....',
    '..kNNNNnNNNNk...',
    '..kNnNNNNNnNk...',
    '.kNNNNnNNNNNNk..',
    '.kNnNNNNNnNNnk..',
    '.knNNnNNNNNnmk..',
    '.kmnnNNnNnnmmk..',
    '..kmmnnnnmmmk...',
    '...kkkkkkkkk....',
    '................',
  ],
  rockB: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kkkk.......',
    '....kNNNNkk.....',
    '...kNNnNNNNk....',
    '..kNNNNNNnNNk...',
    '..kNnNNnNNNNk...',
    '..knNNNNNNnmk...',
    '..kmnNnNNnmmk...',
    '...kmmnnnmmk....',
    '....kkkkkkk.....',
    '................',
    '................',
  ],
  house: [
    '................',
    '.......kk.......',
    '.....kkOOkk.....',
    '....kOOOOOOk....',
    '...kOOOOOOOOk...',
    '..kOOOOOOOOOOk..',
    '.kOOOOOOOOOOOOk.',
    '.kkkkkkkkkkkkkk.',
    '..kDDDDDDDDDDk..',
    '..kDdDDkkDDdDk..',
    '..kDDDkYYkDDDk..',
    '..kDdDkYYkDdDk..',
    '..kDDDkkkkDDDk..',
    '..kDdDDddDDdDk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  medkit: [
    '................',
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kWWWWWWWWk...',
    '...kWWwRRwWWk...',
    '...kWwRRRRwWk...',
    '...kWRRRRRRWk...',
    '...kWwRRRRwWk...',
    '...kWWwRRwWWk...',
    '...kWWWWWWWWk...',
    '...kwwwwwwwwk...',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
  ammo: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '...kkkkkkkkkk...',
    '...kDDDDDDDDk...',
    '...kDkykykyDk...',
    '...kDkykykyDk...',
    '...kDDDDDDDDk...',
    '...kddddddddk...',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
  ],
  radCore: [
    '................',
    '................',
    '................',
    '.....kkkkk......',
    '....kLLLLLk.....',
    '...kLLkkkLLk....',
    '..kLLkXXXkLLk...',
    '..kLkXXLXXkLk...',
    '..kLkXLLLXkLk...',
    '..kLkXXLXXkLk...',
    '..kLLkXXXkLLk...',
    '...kLLkkkLLk....',
    '....kLLLLLk.....',
    '.....kkkkk......',
    '................',
    '................',
  ],
  helipad: [
    'ffffffffffffffff',
    'ffffffFFFFffffff',
    'ffffFFwwwwFFffff',
    'fffFwwffffwwFfff',
    'ffFwffffffffwFff',
    'ffFwffWffWffwFff',
    'fFwfffWffWfffwFf',
    'fFwfffWWWWfffwFf',
    'fFwfffWffWfffwFf',
    'ffFwffWffWffwFff',
    'ffFwffffffffwFff',
    'fffFwwffffwwFfff',
    'ffffFFwwwwFFffff',
    'ffffffFFFFffffff',
    'ffffffffffffffff',
    'ffffffffffffffff',
  ],
  vault: [
    'eeeeeeeeeeeeeeee',
    'eMMMMMMMMMMMMMMe',
    'eMeeeeeeeeeeeeMe',
    'eMeMMMMMMMMMMeMe',
    'eMeMeeeeeeeeMeMe',
    'eMeMeYYeeYYeMeMe',
    'eMeMeeYYYYeeMeMe',
    'eMeMeeYkkYeeMeMe',
    'eMeMeeYYYYeeMeMe',
    'eMeMeYYeeYYeMeMe',
    'eMeMeeeeeeeeMeMe',
    'eMeMMMMMMMMMMeMe',
    'eMeeeeeeeeeeeeMe',
    'eMMMMMMMMMMMMMMe',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
  ],
}

/** Palette swaps for zombie archetypes (skin tones tell the threat apart). */
export const ARCHETYPE_PALETTES = {
  runner: { G: '#b5764a', g: '#84492c' }, // rust-red, fast
  screamer: { G: '#b9b3a4', g: '#847e70' }, // bone-pale
  glower: { G: '#a7d94f', g: '#6f9d2c' }, // toxic bright
}

/** Canopy/trunk swaps per biome ('scrub' uses the base palette). */
export const BIOME_TREE_PALETTES = {
  ashfall: { T: '#6a6560', u: '#4c4844', q: '#3b3733' }, // burned grey
  saltflat: { T: '#8a7a4e', u: '#665a37', q: '#57452c' }, // dry brush
  overgrowth: { T: '#3f8a4e', u: '#2a6338', q: '#4c5a30' }, // lush
}

/**
 * @param {string[]} rows
 * @param {boolean} [flipX]
 * @param {Record<string, string>} [paletteOverride]
 * @returns {HTMLCanvasElement}
 */
function rasterize(rows, flipX = false, paletteOverride = null) {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_PX
  canvas.height = SPRITE_PX
  const ctx = canvas.getContext('2d')
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      ctx.fillStyle = paletteOverride?.[ch] ?? PAL[ch]
      ctx.fillRect(flipX ? SPRITE_PX - 1 - x : x, y, 1, 1)
    }
  }
  return canvas
}

/**
 * Build every sprite (plus mirrored and archetype variants) once.
 * @returns {Record<string, HTMLCanvasElement>}
 */
export function buildAtlas() {
  /** @type {Record<string, HTMLCanvasElement>} */
  const atlas = {}
  for (const [name, rows] of Object.entries(DEFINITIONS)) {
    atlas[name] = rasterize(rows)
  }
  atlas.playerW0 = rasterize(DEFINITIONS.playerE0, true)
  atlas.playerW1 = rasterize(DEFINITIONS.playerE1, true)
  atlas.playerSf = rasterize(DEFINITIONS.playerS, true)
  atlas.playerNf = rasterize(DEFINITIONS.playerN, true)
  atlas.zombieF = rasterize(DEFINITIONS.zombie, true)
  atlas.traderF = rasterize(DEFINITIONS.trader, true)
  for (const [arch, pal] of Object.entries(ARCHETYPE_PALETTES)) {
    atlas[`zombie_${arch}`] = rasterize(DEFINITIONS.zombie, false, pal)
    atlas[`zombie_${arch}F`] = rasterize(DEFINITIONS.zombie, true, pal)
  }
  for (const [biome, pal] of Object.entries(BIOME_TREE_PALETTES)) {
    atlas[`treeA_${biome}`] = rasterize(DEFINITIONS.treeA, false, pal)
    atlas[`treeB_${biome}`] = rasterize(DEFINITIONS.treeB, false, pal)
  }
  return atlas
}

import {
  RADIATION_PULSE_MAX,
  RADIATION_PULSE_MIN,
  VISION_RADIUS,
} from '../utils/constants.js'
import { cellKey, getRadiationPulseRadius } from '../utils/helpers.js'
import { applyEvent, createEffects, stepEffects } from './effects.js'
import { buildAtlas, SPRITE_PX } from './sprites.js'

/** Deterministic per-tile hash for terrain variation. */
function tileHash(x, y) {
  return (Math.imul(x + 11, 48271) ^ Math.imul(y + 7, 92837111)) >>> 0
}

const GROUND_BASE = '#232f1d'
const GROUND_SPECKS = ['#1c2717', '#2a3823', '#20301c', '#3a3a28']
const PATH_BASE = '#5d5140'
const PATH_SPECKS = ['#524734', '#6a5d49', '#565040']

/**
 * Canvas 2D world renderer. Owns its own rAF loop, reads the store's live
 * world every frame, and consumes store events for particles/shake/flashes.
 * React never touches the canvas beyond mounting it.
 */
export class GameRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../game/store.js').GameStore} store
   */
  constructor(canvas, store) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.store = store
    this.atlas = buildAtlas()
    this.fx = createEffects()
    this.rafId = 0
    this.lastTime = 0
    this.cssW = 0
    this.cssH = 0
    this.dpr = 1
    this.tilePx = 48
    this.cam = { x: 0, y: 0, initialized: false }
    /** Baked ground+walls image; re-baked when a new world arrives. */
    this.terrain = null
    this.bakedWorld = null
    /** Fog painted at 1px/tile then upscaled with smoothing for soft edges. */
    this.fogCanvas = document.createElement('canvas')
    /** entity id -> interpolated render position */
    this.entityPos = new Map()
    /** player facing/animation state */
    this.facing = 'S'
    this.lastPlayer = null
    this.walkCycle = 0
    this.unsubEvents = store.onEvents((events) => {
      const player = this.store.world.player
      for (const ev of events) applyEvent(this.fx, ev, player)
    })
    this.loop = this.loop.bind(this)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
    this.unsubEvents()
    this.resizeObserver.disconnect()
  }

  start() {
    if (this.rafId) return
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1)
    this.cssW = rect.width
    this.cssH = rect.height
    this.canvas.width = Math.round(rect.width * this.dpr)
    this.canvas.height = Math.round(rect.height * this.dpr)
    // Portrait gets a taller window: size tiles off the shorter edge so about
    // 13 tiles fit across it, snapped to multiples of 16 for crisp pixels.
    const minSide = Math.min(rect.width, rect.height)
    this.tilePx = Math.max(
      32,
      Math.min(64, Math.round(minSide / 13 / SPRITE_PX) * SPRITE_PX),
    )
  }

  /** Visible world-tile span. */
  viewSize() {
    return { w: this.cssW / this.tilePx, h: this.cssH / this.tilePx }
  }

  bakeTerrain(world) {
    const px = SPRITE_PX
    const terrain = document.createElement('canvas')
    terrain.width = world.cols * px
    terrain.height = world.rows * px
    const ctx = terrain.getContext('2d')
    ctx.imageSmoothingEnabled = false

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const onPath = world.pathSet.has(cellKey(x, y))
        ctx.fillStyle = onPath ? PATH_BASE : GROUND_BASE
        ctx.fillRect(x * px, y * px, px, px)
        const specks = onPath ? PATH_SPECKS : GROUND_SPECKS
        // A few deterministic noise pixels per tile keeps the ground alive.
        for (let i = 0; i < 5; i++) {
          const hh = tileHash(x * 7 + i, y * 13 + i)
          ctx.fillStyle = specks[hh % specks.length]
          const sx = hh % px
          const sy = (hh >> 4) % px
          const size = 1 + (hh % 3 === 0 ? 1 : 0)
          ctx.fillRect(x * px + sx, y * px + sy, size, size)
        }
      }
    }

    // Walls: rocks and trees on top of ground (border rows read as treeline).
    for (const key of world.wallSet) {
      const [x, y] = key.split(',').map(Number)
      const h = tileHash(x, y)
      const sprite =
        h % 3 === 0
          ? this.atlas[h % 2 === 0 ? 'rockA' : 'rockB']
          : this.atlas[(h >> 3) % 2 === 0 ? 'treeA' : 'treeB']
      ctx.drawImage(sprite, x * px, y * px)
    }

    ctx.drawImage(this.atlas.helipad, world.exitCell.x * px, world.exitCell.y * px)
    ctx.drawImage(this.atlas.vault, world.spawnCell.x * px, world.spawnCell.y * px)

    this.terrain = terrain
    this.fogCanvas.width = world.cols
    this.fogCanvas.height = world.rows
    this.bakedWorld = world
    this.entityPos.clear()
    this.cam.initialized = false
  }

  loop(t) {
    this.rafId = requestAnimationFrame(this.loop)
    const dt = Math.min(0.05, (t - this.lastTime) / 1000)
    this.lastTime = t
    this.render(dt, t)
  }

  render(dt, t) {
    const world = this.store.world
    const ctx = this.ctx
    if (!world || this.cssW === 0) return
    if (this.bakedWorld !== world) this.bakeTerrain(world)

    stepEffects(this.fx, dt)

    const view = this.viewSize()
    const px = this.tilePx

    // Camera: ease toward the player, clamped to the world (centered if the
    // world is smaller than the view).
    const targetX = world.player.x - view.w / 2
    const targetY = world.player.y - view.h / 2
    if (!this.cam.initialized) {
      this.cam.x = targetX
      this.cam.y = targetY
      this.cam.initialized = true
    } else {
      const ease = Math.min(1, dt * 7)
      this.cam.x += (targetX - this.cam.x) * ease
      this.cam.y += (targetY - this.cam.y) * ease
    }
    const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    this.cam.x = clamp(this.cam.x, 0, world.cols - view.w)
    this.cam.y = clamp(this.cam.y, 0, world.rows - view.h)

    let camX = this.cam.x
    let camY = this.cam.y
    if (this.fx.shake > 0.001) {
      const mag = this.fx.shake * 0.12
      camX += (Math.random() - 0.5) * mag
      camY += (Math.random() - 0.5) * mag
    }

    const toScreen = (wx, wy) => ({ x: (wx - camX) * px, y: (wy - camY) * px })

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#0c0a08'
    ctx.fillRect(0, 0, this.cssW, this.cssH)

    // Terrain slice.
    ctx.drawImage(
      this.terrain,
      camX * SPRITE_PX,
      camY * SPRITE_PX,
      view.w * SPRITE_PX,
      view.h * SPRITE_PX,
      0,
      0,
      this.cssW,
      this.cssH,
    )

    const now = Date.now()
    const isRevealed = (wx, wy) =>
      world.revealed.has(cellKey(Math.floor(wx), Math.floor(wy)))
    const inView = (wx, wy, pad = 2) =>
      wx > camX - pad && wx < camX + view.w + pad && wy > camY - pad && wy < camY + view.h + pad

    // Radiation zones (under sprites).
    for (const e of world.entities) {
      if (e.defeated || e.kind !== 'radiation') continue
      const cx = e.x + 0.5
      const cy = e.y + 0.5
      if (!inView(cx, cy, 3) || !isRevealed(e.x, e.y)) continue
      const r = getRadiationPulseRadius(e, now, RADIATION_PULSE_MIN, RADIATION_PULSE_MAX)
      const s = toScreen(cx, cy)
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * px)
      grad.addColorStop(0, 'rgba(182,201,63,0.28)')
      grad.addColorStop(0.75, 'rgba(182,201,63,0.14)')
      grad.addColorStop(1, 'rgba(182,201,63,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(s.x, s.y, r * px, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(182,201,63,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Supply drop flare: visible through fog — that's the point of a flare.
    const drop = world.supplyDrop
    if (drop?.state === 'active') {
      const cx = drop.x + 0.5
      const cy = drop.y + 0.5
      if (inView(cx, cy, 6)) {
        const s = toScreen(cx, cy)
        const phase = (t / 700) % 1
        ctx.strokeStyle = `rgba(255,160,60,${0.65 * (1 - phase)})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(s.x, s.y, (0.25 + phase * 1.4) * px, 0, Math.PI * 2)
        ctx.stroke()
        // Light column
        const beam = ctx.createLinearGradient(s.x, s.y - px * 5, s.x, s.y)
        beam.addColorStop(0, 'rgba(255,160,60,0)')
        beam.addColorStop(1, 'rgba(255,160,60,0.35)')
        ctx.fillStyle = beam
        ctx.fillRect(s.x - px * 0.12, s.y - px * 5, px * 0.24, px * 5)
        ctx.fillStyle = `rgba(255,220,140,${0.6 + 0.4 * Math.sin(t / 90)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, px * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Helipad beacon when discovered.
    if (world.revealed.has(cellKey(world.exitCell.x, world.exitCell.y))) {
      const s = toScreen(world.exitCell.x + 0.5, world.exitCell.y + 0.5)
      if (inView(world.exitCell.x, world.exitCell.y, 4)) {
        const phase = (t / 900) % 1
        ctx.strokeStyle = `rgba(255,209,102,${0.5 * (1 - phase)})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(s.x, s.y, (0.3 + phase * 0.9) * px, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    this.drawEntities(world, toScreen, inView, isRevealed, dt, t, px)
    this.drawProjectiles(world, toScreen, now, px)
    this.drawParticles(toScreen, px)
    this.drawFog(world, camX, camY, view)
    this.drawFloaters(toScreen)
    this.drawOverlays(world)
  }

  drawEntities(world, toScreen, inView, isRevealed, dt, t, px) {
    const ctx = this.ctx
    /** @type {{y: number, draw: () => void}[]} */
    const drawables = []

    for (const e of world.entities) {
      if (e.defeated || e.kind === 'radiation') continue
      const isHostile = e.kind === 'zombie' || e.kind === 'trader'
      const wx = isHostile ? e.x : e.x + 0.5
      const wy = isHostile ? e.y : e.y + 0.5
      if (!inView(wx, wy) || !isRevealed(wx - 0.5, wy - 0.5)) continue

      let rx = wx
      let ry = wy
      if (isHostile) {
        // Hostiles hop tiles on a cadence; ease their render position.
        let rp = this.entityPos.get(e.id)
        if (!rp) {
          rp = { x: wx, y: wy }
          this.entityPos.set(e.id, rp)
        }
        const ease = Math.min(1, dt * 6)
        rp.x += (wx - rp.x) * ease
        rp.y += (wy - rp.y) * ease
        rx = rp.x
        ry = rp.y
      }

      drawables.push({
        y: ry,
        draw: () => {
          const s = toScreen(rx, ry)
          if (e.kind === 'zombie' || e.kind === 'trader') {
            // Chasers animate twice as fast — reads as urgency.
            const cadence = e.chasing ? 240 : 480
            const phase = (t / cadence + (e.id.charCodeAt(2) % 7)) | 0
            const flip = phase % 2 === 1
            const bob = Math.sin(t / (e.chasing ? 120 : 240) + e.id.length) * px * 0.03
            let sprite
            if (e.kind === 'zombie') {
              const arch = e.archetype && e.archetype !== 'shambler' ? e.archetype : null
              const base = arch ? `zombie_${arch}` : 'zombie'
              sprite = this.atlas[flip ? `${base}F` : base] ?? this.atlas.zombie
            } else {
              sprite = flip ? this.atlas.traderF : this.atlas.trader
            }
            if (e.kind === 'zombie' && e.archetype === 'glower') {
              const glow = ctx.createRadialGradient(s.x, s.y - px * 0.3, 0, s.x, s.y - px * 0.3, px * 1.1)
              glow.addColorStop(0, 'rgba(167,217,79,0.28)')
              glow.addColorStop(1, 'rgba(167,217,79,0)')
              ctx.fillStyle = glow
              ctx.beginPath()
              ctx.arc(s.x, s.y - px * 0.3, px * 1.1, 0, Math.PI * 2)
              ctx.fill()
            }
            this.drawShadow(s.x, s.y, px)
            ctx.drawImage(sprite, s.x - px / 2, s.y - px * 0.82 + bob, px, px)
            if (e.kind === 'trader') {
              const angry = e.angryUntil && Date.now() < e.angryUntil
              this.tag(s.x, s.y - px * 0.95, e.traded ? 'TRADED' : angry ? 'HOSTILE' : 'TRADER', angry ? '#e8564a' : '#ffd166')
            }
          } else if (e.kind === 'pickup') {
            const bob = Math.sin(t / 350 + e.x) * px * 0.04
            const sprite = e.pickupType === 'health' ? this.atlas.medkit : this.atlas.ammo
            ctx.drawImage(sprite, s.x - px / 2, s.y - px / 2 + bob, px, px)
          } else if (e.kind === 'house') {
            ctx.drawImage(this.atlas.house, s.x - px / 2, s.y - px * 0.7, px, px)
            this.tag(s.x, s.y + px * 0.42, 'REST', '#d9c9a3')
          }
        },
      })
    }

    // Radiation cores above zones but below characters is fine — push first.
    for (const e of world.entities) {
      if (e.defeated || e.kind !== 'radiation') continue
      const wx = e.x + 0.5
      const wy = e.y + 0.5
      if (!inView(wx, wy) || !isRevealed(e.x, e.y)) continue
      drawables.push({
        y: wy - 0.4,
        draw: () => {
          const s = toScreen(wx, wy)
          const pulse = 0.75 + 0.25 * Math.sin(t / 300 + e.x)
          ctx.globalAlpha = pulse
          ctx.drawImage(this.atlas.radCore, s.x - px * 0.4, s.y - px * 0.4, px * 0.8, px * 0.8)
          ctx.globalAlpha = 1
        },
      })
    }

    // Player: facing + walk cycle derived from motion.
    const p = world.player
    if (this.lastPlayer) {
      const mx = p.x - this.lastPlayer.x
      const my = p.y - this.lastPlayer.y
      const moving = Math.hypot(mx, my) > 0.001
      if (moving) {
        this.walkCycle += dt * 9
        if (Math.abs(mx) > Math.abs(my)) this.facing = mx > 0 ? 'E' : 'W'
        else this.facing = my > 0 ? 'S' : 'N'
      }
    }
    this.lastPlayer = { x: p.x, y: p.y }

    drawables.push({
      y: p.y,
      draw: () => {
        const s = toScreen(p.x, p.y)
        const frame = Math.floor(this.walkCycle) % 2
        let sprite
        if (this.facing === 'E') sprite = frame ? this.atlas.playerE1 : this.atlas.playerE0
        else if (this.facing === 'W') sprite = frame ? this.atlas.playerW1 : this.atlas.playerW0
        else if (this.facing === 'N') sprite = frame ? this.atlas.playerNf : this.atlas.playerN
        else sprite = frame ? this.atlas.playerSf : this.atlas.playerS
        this.drawShadow(s.x, s.y, px)
        ctx.drawImage(sprite, s.x - px / 2, s.y - px * 0.82, px, px)
      },
    })

    drawables.sort((a, b) => a.y - b.y)
    for (const d of drawables) d.draw()
  }

  drawShadow(x, y, px) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(x, y + px * 0.08, px * 0.26, px * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  tag(x, y, text, color) {
    const ctx = this.ctx
    ctx.font = `600 ${Math.max(8, this.tilePx * 0.2)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const w = ctx.measureText(text).width
    ctx.fillRect(x - w / 2 - 2, y - this.tilePx * 0.16, w + 4, this.tilePx * 0.22)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

  drawProjectiles(world, toScreen, now, px) {
    const ctx = this.ctx
    const pr = world.projectile
    if (pr && pr.startAt != null) {
      const t01 = Math.min(1, (now - pr.startAt) / (pr.expiresAt - pr.startAt))
      const dist = 4 * t01
      const s = toScreen(pr.ox + pr.dx * dist, pr.oy + pr.dy * dist)
      ctx.strokeStyle = 'rgba(255,224,130,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(s.x - pr.dx * px * 0.35, s.y - pr.dy * px * 0.35)
      ctx.lineTo(s.x, s.y)
      ctx.stroke()
      ctx.fillStyle = '#fff3c4'
      ctx.beginPath()
      ctx.arc(s.x, s.y, px * 0.07, 0, Math.PI * 2)
      ctx.fill()
    }
    const hp = world.hostileProjectile
    if (hp && hp.startAt != null) {
      const t01 = Math.min(1, (now - hp.startAt) / (hp.expiresAt - hp.startAt))
      const x = hp.sx + (hp.tx - hp.sx) * t01
      const y = hp.sy + (hp.ty - hp.sy) * t01
      const s = toScreen(x, y)
      ctx.fillStyle = '#e8564a'
      ctx.beginPath()
      ctx.arc(s.x, s.y, px * 0.09, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawParticles(toScreen, px) {
    const ctx = this.ctx
    for (const p of this.fx.particles) {
      const s = toScreen(p.x, p.y)
      const a = 1 - p.age / p.ttl
      ctx.globalAlpha = Math.max(0, a)
      ctx.fillStyle = p.color
      const size = Math.max(1.5, p.size * px)
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size)
    }
    ctx.globalAlpha = 1
  }

  drawFog(world, camX, camY, view) {
    const ctx = this.ctx
    const fog = this.fogCanvas
    const fctx = fog.getContext('2d')
    const img = fctx.createImageData(world.cols, world.rows)
    const data = img.data
    const pxf = Math.floor(world.player.x)
    const pyf = Math.floor(world.player.y)
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const i = (y * world.cols + x) * 4 + 3
        if (!world.revealed.has(cellKey(x, y))) {
          data[i] = 252
          continue
        }
        const d = Math.hypot(x - pxf, y - pyf)
        const dim = 0.52 // explored-but-out-of-sight
        const inner = VISION_RADIUS - 3.2
        const a = d <= inner ? 0 : Math.min(1, (d - inner) / 3.2)
        data[i] = Math.round(255 * dim * a)
      }
    }
    fctx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(
      fog,
      camX,
      camY,
      view.w,
      view.h,
      0,
      0,
      this.cssW,
      this.cssH,
    )
    ctx.imageSmoothingEnabled = false
  }

  drawFloaters(toScreen) {
    const ctx = this.ctx
    for (const f of this.fx.floaters) {
      const s = toScreen(f.x, f.y)
      const a = 1 - f.age / f.ttl
      ctx.globalAlpha = Math.max(0, a)
      ctx.font = `700 ${Math.max(11, this.tilePx * 0.3)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'
      ctx.lineWidth = 3
      ctx.strokeText(f.text, s.x, s.y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, s.x, s.y)
    }
    ctx.globalAlpha = 1
  }

  drawOverlays(world) {
    const ctx = this.ctx
    // Ambient vignette.
    const grad = ctx.createRadialGradient(
      this.cssW / 2,
      this.cssH / 2,
      Math.min(this.cssW, this.cssH) * 0.42,
      this.cssW / 2,
      this.cssH / 2,
      Math.max(this.cssW, this.cssH) * 0.72,
    )
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(8,6,4,0.5)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.cssW, this.cssH)

    // Low-vitals heartbeat vignette.
    const frac = world.health / 130
    if (world.playing && frac < 0.3) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260)
      ctx.fillStyle = `rgba(150,20,20,${(0.3 - frac) * (0.5 + pulse * 0.5)})`
      ctx.fillRect(0, 0, this.cssW, this.cssH)
    }

    if (this.fx.flash.alpha > 0.004) {
      ctx.fillStyle = this.fx.flash.color
      ctx.globalAlpha = this.fx.flash.alpha
      ctx.fillRect(0, 0, this.cssW, this.cssH)
      ctx.globalAlpha = 1
    }
  }
}

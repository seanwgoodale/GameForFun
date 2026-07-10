/**
 * Synthesized audio — no sample assets. One AudioContext, unlocked on the
 * first user gesture (browser autoplay policy), fed by world events plus a
 * slow poll of world state for ambience (geiger proximity, low-vitals
 * heartbeat, wind). Mute is persisted.
 */

const MUTE_KEY = 'we-muted'

class AudioSystem {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null
    this.master = null
    this.noiseBuf = null
    this.muted = false
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      /* private mode */
    }
    this.windGain = null
    this.lastGeiger = 0
    this.lastHeartbeat = 0
    this.pollId = 0
    this.store = null
    this.unsubEvents = null
    this.muteListeners = new Set()
  }

  /** @param {import('./store.js').GameStore} store */
  attach(store) {
    if (this.store) return
    this.store = store
    this.unsubEvents = store.onEvents((events) => {
      for (const ev of events) this.onEvent(ev)
    })
    const unlock = () => {
      this.ensureContext()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    this.pollId = window.setInterval(() => this.poll(), 150)
  }

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)
      // 1s of white noise, reused by every noise-based voice.
      const len = this.ctx.sampleRate
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this.startWind()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  isMuted() {
    return this.muted
  }

  toggleMuted() {
    this.muted = !this.muted
    try {
      window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02)
    }
    for (const l of [...this.muteListeners]) l(this.muted)
    return this.muted
  }

  onMuteChange(listener) {
    this.muteListeners.add(listener)
    return () => this.muteListeners.delete(listener)
  }

  /** Short filtered-noise burst (shots, thuds, static). */
  noise({ duration = 0.15, volume = 0.5, filterHz = 1200, type = 'lowpass', when = 0 }) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = filterHz
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(t, Math.random(), duration + 0.05)
    src.stop(t + duration + 0.06)
  }

  /** Simple oscillator voice with pitch + volume envelopes. */
  tone({ from = 440, to = from, duration = 0.15, volume = 0.25, type = 'square', when = 0 }) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + duration)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  onEvent(ev) {
    if (!this.ctx || this.muted) return
    switch (ev.type) {
      case 'player-shot':
        this.noise({ duration: 0.14, volume: 0.55, filterHz: 2400 })
        this.tone({ from: 220, to: 70, duration: 0.1, volume: 0.3, type: 'triangle' })
        break
      case 'hostile-shot':
        this.noise({ duration: 0.12, volume: 0.35, filterHz: 1400 })
        break
      case 'damage':
        this.tone({ from: 160, to: 55, duration: 0.18, volume: 0.4, type: 'sine' })
        this.noise({ duration: 0.08, volume: 0.2, filterHz: 500 })
        break
      case 'kill':
        this.tone({ from: 200, to: 50, duration: 0.45, volume: 0.3, type: 'sawtooth' })
        this.noise({ duration: 0.3, volume: 0.25, filterHz: 700 })
        break
      case 'anger':
        this.tone({ from: 300, to: 150, duration: 0.25, volume: 0.25, type: 'sawtooth' })
        break
      case 'pickup':
        this.tone({ from: 660, to: 660, duration: 0.07, volume: 0.2 })
        this.tone({ from: 880, to: 880, duration: 0.09, volume: 0.2, when: 0.08 })
        break
      case 'heal':
        this.tone({ from: 523, duration: 0.1, volume: 0.18, type: 'triangle' })
        this.tone({ from: 659, duration: 0.1, volume: 0.18, type: 'triangle', when: 0.09 })
        this.tone({ from: 784, duration: 0.16, volume: 0.18, type: 'triangle', when: 0.18 })
        break
      case 'encounter-open':
        this.tone({ from: 110, to: 82, duration: 0.4, volume: 0.3, type: 'sawtooth' })
        break
      case 'extract':
        this.tone({ from: 523, duration: 0.14, volume: 0.3 })
        this.tone({ from: 659, duration: 0.14, volume: 0.3, when: 0.14 })
        this.tone({ from: 1046, duration: 0.4, volume: 0.3, when: 0.28 })
        break
      case 'death':
        this.tone({ from: 220, to: 40, duration: 1.1, volume: 0.4, type: 'sawtooth' })
        this.noise({ duration: 0.9, volume: 0.3, filterHz: 400 })
        break
      default:
        break
    }
  }

  /** Ambient state: geiger clicks near radiation, heartbeat when critical. */
  poll() {
    if (!this.ctx || this.muted || !this.store) return
    const world = this.store.world
    if (!world.playing || world.encounterId) return
    const now = performance.now()

    let nearest = Infinity
    for (const e of world.entities) {
      if (e.defeated || e.kind !== 'radiation') continue
      const d = Math.hypot(world.player.x - (e.x + 0.5), world.player.y - (e.y + 0.5))
      if (d < nearest) nearest = d
    }
    if (nearest < 6) {
      // Click rate ramps from sparse at 6 tiles to frantic inside the zone.
      const intensity = 1 - Math.max(0, nearest - 0.5) / 5.5
      const interval = 400 - intensity * 330
      if (now - this.lastGeiger > interval * (0.6 + Math.random() * 0.8)) {
        this.lastGeiger = now
        this.noise({ duration: 0.015, volume: 0.16 + intensity * 0.2, filterHz: 4000, type: 'highpass' })
      }
    }

    if (world.health / 130 < 0.3 && now - this.lastHeartbeat > 900) {
      this.lastHeartbeat = now
      this.tone({ from: 55, to: 45, duration: 0.09, volume: 0.4, type: 'sine' })
      this.tone({ from: 50, to: 42, duration: 0.08, volume: 0.3, type: 'sine', when: 0.16 })
    }

    if (this.windGain) {
      const target = world.playing ? 0.05 : 0
      this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6)
    }
  }

  startWind() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 300
    filter.Q.value = 0.4
    this.windGain = this.ctx.createGain()
    this.windGain.gain.value = 0
    src.connect(filter).connect(this.windGain).connect(this.master)
    src.start()
    // Slow LFO on the filter makes the wind breathe.
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 140
    lfo.connect(lfoGain).connect(filter.frequency)
    lfo.start()
  }
}

export const audio = new AudioSystem()

/**
 * Transient visual state fed by world events: particles, floating text,
 * screen shake, and full-screen flashes. All positions are world-tile floats;
 * the renderer projects them to screen space.
 */

export function createEffects() {
  return {
    /** @type {{x:number,y:number,vx:number,vy:number,ttl:number,age:number,size:number,color:string,gravity:number}[]} */
    particles: [],
    /** @type {{x:number,y:number,text:string,color:string,ttl:number,age:number}[]} */
    floaters: [],
    shake: 0,
    /** @type {{color:string,alpha:number}} */
    flash: { color: '#000', alpha: 0 },
  }
}

function burst(fx, x, y, { count, color, speed = 3, ttl = 0.5, size = 0.09, gravity = 0, spread = Math.PI * 2, angle = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread
    const v = speed * (0.4 + Math.random() * 0.6)
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      ttl: ttl * (0.6 + Math.random() * 0.8),
      age: 0,
      size: size * (0.7 + Math.random() * 0.6),
      color,
      gravity,
    })
  }
}

function floater(fx, x, y, text, color, ttl = 0.9) {
  fx.floaters.push({ x, y, text, color, ttl, age: 0 })
}

function setFlash(fx, color, alpha) {
  if (alpha > fx.flash.alpha) fx.flash = { color, alpha }
}

/**
 * Translate one world event into effects. Player-anchored events use the
 * live player position at render time via `player`.
 * @param {ReturnType<typeof createEffects>} fx
 * @param {{ type: string } & Record<string, any>} ev
 * @param {{ x: number; y: number }} player
 */
export function applyEvent(fx, ev, player) {
  switch (ev.type) {
    case 'player-shot':
      burst(fx, ev.x + ev.dx * 0.5, ev.y + ev.dy * 0.5, {
        count: 6,
        color: '#ffd166',
        speed: 4,
        ttl: 0.18,
        angle: Math.atan2(ev.dy, ev.dx),
        spread: 0.9,
      })
      fx.shake = Math.max(fx.shake, 0.12)
      break
    case 'hostile-shot':
      burst(fx, ev.x, ev.y, { count: 4, color: '#e8564a', speed: 3, ttl: 0.15 })
      break
    case 'kill':
      burst(fx, ev.x, ev.y, { count: 16, color: '#7fa055', speed: 3.5, ttl: 0.6, gravity: 4 })
      burst(fx, ev.x, ev.y, { count: 8, color: '#b23a3a', speed: 2.5, ttl: 0.45, gravity: 5 })
      floater(fx, ev.x, ev.y - 0.4, 'DOWN', '#d9e8d0')
      break
    case 'anger':
      floater(fx, ev.x, ev.y - 0.4, '!!', '#ffd166')
      break
    case 'damage':
      setFlash(fx, '#b23a3a', Math.min(0.4, 0.12 + ev.amount / 90))
      fx.shake = Math.max(fx.shake, Math.min(0.6, ev.amount / 40))
      floater(fx, player.x, player.y - 0.6, `-${Math.round(ev.amount)}`, '#ff7b6b')
      break
    case 'heal':
      setFlash(fx, '#3f9d5c', 0.14)
      floater(fx, player.x, player.y - 0.6, '+MED', '#8fe0a5')
      break
    case 'pickup':
      burst(fx, ev.x, ev.y, {
        count: 10,
        color: ev.weapon ? '#c9a227' : '#8fe0a5',
        speed: 2.2,
        ttl: 0.5,
        gravity: -2,
      })
      break
    case 'scream':
      burst(fx, ev.x, ev.y, { count: 22, color: '#e8e4da', speed: 6, ttl: 0.5 })
      floater(fx, ev.x, ev.y - 0.7, 'SCREEEE', '#e8e4da', 1.1)
      fx.shake = Math.max(fx.shake, 0.3)
      break
    case 'supply-drop':
      burst(fx, ev.x + 0.5, ev.y + 0.5, { count: 26, color: '#ffa03c', speed: 4.5, ttl: 0.9, gravity: -3 })
      floater(fx, ev.x + 0.5, ev.y - 0.4, 'SUPPLY FLARE', '#ffc37a', 1.4)
      break
    case 'objective-complete':
      floater(fx, player.x, player.y - 0.8, `+${ev.score} SUPPLIES SECURED`, '#ffd166', 1.3)
      burst(fx, player.x, player.y, { count: 14, color: '#ffd166', speed: 3, ttl: 0.6, gravity: -2 })
      break
    case 'death':
      setFlash(fx, '#5e0f0f', 0.55)
      fx.shake = Math.max(fx.shake, 0.8)
      break
    case 'extract':
      burst(fx, player.x, player.y, { count: 40, color: '#ffd166', speed: 5, ttl: 1.1 })
      setFlash(fx, '#ffd166', 0.25)
      break
    default:
      break
  }
}

/**
 * Advance particle/floater/shake/flash state by dt seconds.
 * @param {ReturnType<typeof createEffects>} fx
 * @param {number} dt
 */
export function stepEffects(fx, dt) {
  for (const p of fx.particles) {
    p.age += dt
    p.vy += p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  fx.particles = fx.particles.filter((p) => p.age < p.ttl)
  for (const f of fx.floaters) {
    f.age += dt
    f.y -= dt * 0.9
  }
  fx.floaters = fx.floaters.filter((f) => f.age < f.ttl)
  fx.shake = Math.max(0, fx.shake - dt * 2.2)
  fx.flash.alpha = Math.max(0, fx.flash.alpha - dt * 1.6)
}

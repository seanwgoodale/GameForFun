# Wasteland Escape

A top-down survival game for the browser. You emerge from a vault into a procedurally
generated wasteland: clear the zombie quota, dodge pulsing radiation zones, trade (or
fight) your way past wanderers, and reach the extraction helipad before the 10-minute
clock runs out.

**Play it:** <https://seanwilliamgoodale.com/project/game/>

## Gameplay

- Procedurally generated 84×56 tile world with fog of war and four biomes
  (scrub, ashfall, salt flat, overgrowth) — every run is a new map, and
  `?seed=anything` or the Daily Run deals the same one on purpose
- Custom Canvas 2D renderer with hand-authored pixel-art sprites, particles,
  corpse decals, screen shake, and synthesized WebAudio sound (geiger clicks,
  heartbeat, footsteps, an ambient drone — zero audio files)
- Zombies hunt: chase AI plus archetypes — rust-red runners, bone-pale
  screamers that wake the horde, glowing ones that leak radiation
- Diegetic encounters: 49 authored situations with risk/reward choices and
  chained payoffs — help the pilgrim early and their order repays you later
- Three difficulty presets, a supply-drop side objective marked by a flare,
  and a local top-10 leaderboard
- Controls: WASD/arrows + Space/H on desktop, joystick + FIRE/MED thumb
  buttons on touch, or a standard gamepad (left stick, A fires, B/X heals)
- Installable PWA with offline support; respects `prefers-reduced-motion`
- Eliminate 10 hostiles to unlock extraction at the helipad before the clock dies

### Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Space | Fire ranged shot (last move direction, 4-tile range) |
| H | Use a medkit |
| M | Toggle minimap |
| Esc | Close minimap |

## Development

```bash
npm install
npm run dev       # dev server at /project/game/
npm run build     # production build to dist/
npm run lint      # eslint
npm test          # vitest (pure game-logic tests)
```

Stack: React 19 · Vite 8 · Tailwind CSS 4. The simulation lives in plain-JS modules
under `src/game/` (single fixed-timestep loop, world-time effects); `src/render/`
draws the world on a canvas (sprite atlas, baked terrain, fog, particles); React
handles screens, HUD overlay, and the encounter panel. All art is generated from
pixel matrices in `src/render/sprites.js`; all audio is synthesized — the repo
ships zero binary assets.

## Deployment

The game deploys as its own Netlify site from this repo (`netlify.toml` builds into
`deploy/project/game/`). The main portfolio site proxies
`seanwilliamgoodale.com/project/game/*` to this site with a status-200 redirect, so the
app is built with Vite `base: '/project/game/'` — that path prefix is load-bearing.

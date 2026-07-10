# Wasteland Escape — agent notes

Top-down survival game: React 19 + Vite 8 + Tailwind 4, plain JS with JSDoc types (no
TypeScript). No game framework — the simulation is hand-rolled.

## Commands

- `npm run dev` — dev server (opens `/project/game/`)
- `npm run build` — production build (`--configLoader runner` works around a Rolldown
  config-bundling hang on iCloud-synced disks; keep it)
- `npm run lint` / `npm test` (vitest)

## Architecture

- `src/game/` — **all simulation logic, plain JS, no React imports.** World state is a
  mutable object; one fixed-timestep loop drives every system (movement, hostile AI,
  contact/radiation damage, pickups, encounter triggering). Damage and death go through
  a single pipeline. Timed effects (projectiles, trader anger) are world-time based —
  never `setTimeout` (stale timers once caused post-restart damage).
- `src/game/levelGen.js` — procedural map generation (`generateLevel`), seeded
  mulberry32 RNG. Pure: safe to unit-test. Radiation keeps ≥10 tiles from spawn.
- `src/game/store.js` + `gameStore.js` — the store singleton owns the rAF loop, input
  refs, snapshots (versioned, rebuilt only on change), and an event channel
  (`store.onEvents`) that feeds the renderer particles and the audio system.
- `src/render/` — Canvas 2D renderer. `sprites.js` holds hand-authored 16×16 pixel
  matrices (validated by tests: 16 rows × 16 palette chars) rasterized to an atlas;
  `renderer.js` does camera lerp/shake, baked terrain, y-sorted sprites, fog
  (1px/tile canvas upscaled with smoothing), projectile tracers; `effects.js` holds
  particles/floaters/flashes driven by world events. React never draws the world.
- `src/game/audio.js` — synthesized WebAudio SFX + ambience (no audio assets).
  Unlocks on first gesture; mute persists.
- `src/data/encounters.js` — diegetic encounter deck (kind-matched pools, weighted
  outcomes). Every hostile encounter must offer a possible kill, every trader a
  possible trade — tests enforce this.
- `src/hooks/` — thin React bindings only (`useGame` via `useSyncExternalStore`);
  components must not contain game rules.
- `src/components/` — `screens/` (Home/Game/End), `game/` (CanvasMap host,
  EncounterPanel, TouchControls, MinimapOverlay).
- `src/utils/constants.js` — every tunable (damage, speeds, counts, timings). Add new
  tunables here, never inline.

Mobile: one full-viewport layout for all form factors; touch UI (joystick +
FIRE/MED, per-element pointer capture) appears for coarse pointers/touch devices,
`?touch` query forces it for desktop debugging. Safe-area insets via
`env(safe-area-inset-*)`, `viewport-fit=cover`, pinch/overscroll disabled.

Coordinates: world is a tile grid, positions are floats in tile units (tile center =
`+0.5`); `wallSet`/`revealed`/`pathSet` are `Set<string>` keyed by `cellKey(x, y)` →
`"x,y"`.

## Deployment (path prefix is load-bearing)

Served at `https://seanwilliamgoodale.com/project/game/` — the portfolio site (separate
repo) proxies that path to this repo's own Netlify site via a status-200 redirect. Hence
Vite `base: '/project/game/'` and the `netlify.toml` build that publishes into
`deploy/project/game/`. Pushing `main` auto-deploys production: do feature work on
branches.

## Roadmap context

Vibe-coded original is being overhauled in sequences. Decided direction: custom Canvas
2D renderer (React keeps HUD/menus), pixel-art tileset replacing emoji glyphs, diegetic
choice-based encounters replacing quiz modals, portrait-first mobile with on-screen
fire/medkit buttons.

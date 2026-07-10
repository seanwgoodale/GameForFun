# Wasteland Escape

A top-down survival game for the browser. You emerge from a vault into a procedurally
generated wasteland: clear the zombie quota, dodge pulsing radiation zones, trade (or
fight) your way past wanderers, and reach the extraction helipad before the 10-minute
clock runs out.

**Play it:** <https://seanwilliamgoodale.com/project/game/>

## Gameplay

- Procedurally generated 84×56 tile world with fog of war — every run is a new map
- Smooth 360° movement (WASD / arrows on desktop, virtual joystick on touch)
- Roaming zombies and traders, radiation hotspots that pulse and drift
- Encounters: talk your way through or spend sidearm charges
- Scavenge medkits and ammo; rest houses restore vitals
- Eliminate 10 zombies to unlock extraction at the helipad

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

Stack: React 19 · Vite 8 · Tailwind CSS 4. Game simulation lives in plain-JS modules
under `src/game/`; React renders the world and HUD.

## Deployment

The game deploys as its own Netlify site from this repo (`netlify.toml` builds into
`deploy/project/game/`). The main portfolio site proxies
`seanwilliamgoodale.com/project/game/*` to this site with a status-200 redirect, so the
app is built with Vite `base: '/project/game/'` — that path prefix is load-bearing.

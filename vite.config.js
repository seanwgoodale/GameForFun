import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * `/project/game` (no trailing slash) makes `./src/main.jsx` resolve wrong in the
 * browser → blank page. Redirect to `/project/game/`.
 */
function redirectBaseTrailingSlash() {
  return {
    name: 'redirect-base-trailing-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }
        const base = server.config.base || '/'
        if (base === '/') {
          next()
          return
        }
        const baseNoTrail = base.replace(/\/$/, '')
        const pathOnly = (req.url ?? '').split('?')[0] ?? ''
        if (pathOnly === baseNoTrail) {
          const qs = (req.url ?? '').includes('?')
            ? `?${(req.url ?? '').split('?')[1]}`
            : ''
          res.writeHead(302, { Location: `${base}${qs}` })
          res.end()
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
// Must match the URL path where the app is hosted (trailing slash required).
//
// Build uses `vite build --configLoader runner` (see package.json) so Vite does not
// pre-bundle this file with Rolldown — that step often appears to “hang” on iCloud Drive.
export default defineConfig({
  base: '/project/game/',
  plugins: [redirectBaseTrailingSlash(), react(), tailwindcss()],
  server: {
    // Avoid opening `/` in the browser (wrong with a non-root `base`).
    open: '/project/game/',
    host: true,
  },
  build: {
    // Gzip size step can stall on large outputs or slow disks.
    reportCompressedSize: false,
  },
  preview: {
    open: '/project/game/',
    host: true,
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Function form so we can read VITE_API_BASE via loadEnv() (import.meta.env
// isn't available yet at config-eval time) and conditionally wire up the dev
// proxy below. `mode` is 'development' for `vite`/`vite dev`, 'production'
// for `vite build`, and 'test' for vitest — loadEnv's 3rd arg '' means "load
// every var, not just VITE_-prefixed ones", but we only ever read
// VITE_-prefixed vars from the result here.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const config = {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      // Tests must behave identically whether or not a developer's local
      // .env/.env.local points at a real backend (loadEnv pulls those files
      // in for mode 'test' too) — pin the connection-related vars so every
      // http()/fetch assertion sees relative /mobileApi/... paths and mock
      // mode stays the default.
      env: {
        VITE_API_BASE: '',
        VITE_USE_PROXY: '',
        VITE_USE_MOCK: '',
      },
    },
  }

  // Dev-only CORS workaround (docs/specs/2026-07-16-backend-integration-design.md
  // §2 "Dev CORS"): when VITE_API_BASE is set, proxy same-origin `/mobileApi`
  // requests to it so the browser never makes a cross-origin call in dev.
  // Only takes effect for `vite`/`vite dev` — `vite build` and vitest never
  // start a dev server, so `server.proxy` is inert there either way. Paired
  // with `VITE_USE_PROXY=true` (see src/api/client.js's apiBase()), which
  // makes the app itself call relative '/mobileApi/...' paths so requests
  // actually hit this proxy instead of VITE_API_BASE directly. See README
  // "Backend integration" for the two dev setups (proxy vs direct CORS).
  if (env.VITE_API_BASE) {
    config.server = {
      proxy: {
        '/mobileApi': {
          target: env.VITE_API_BASE,
          changeOrigin: true,
        },
      },
    }
  }

  return config
})

// Shared API client: env-driven mock switch, artificial latency, and a thin
// fetch wrapper for the real API (routes arrive with the API spec).

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function defaultMs() {
  return import.meta.env.MODE === 'test' ? 0 : 400 + Math.random() * 400
}

export function delay(ms = defaultMs()) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function http(path, opts = {}) {
  const base = import.meta.env.VITE_API_BASE || ''
  const res = await fetch(`${base}${path}`, opts)
  if (!res.ok) {
    throw new Error(`API request failed: ${opts.method || 'GET'} ${path} (${res.status})`)
  }
  return res.json()
}

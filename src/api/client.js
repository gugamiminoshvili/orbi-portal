// Shared API client: env-driven mock switch, artificial latency, and a thin
// fetch wrapper for the real API (routes arrive with the API spec).

import { tokenStore } from './tokenStore'
import { ApiError, parseEnvelope } from './errors'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function defaultMs() {
  return import.meta.env.MODE === 'test' ? 0 : 400 + Math.random() * 400
}

export function delay(ms = defaultMs()) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function apiBase() {
  return import.meta.env.VITE_API_BASE || ''
}

// Single-flight refresh: concurrent 401s share one in-flight refresh call so
// the backend only ever sees one POST /mobileApi/refresh/ per expiry.
let refreshPromise = null

async function doRefresh() {
  const refresh = tokenStore.getRefresh()
  if (!refresh) {
    throw new Error('no refresh token')
  }
  // Raw fetch, deliberately not routed through http() — the refresh call
  // must never itself trigger the 401 handler and recurse.
  const res = await fetch(`${apiBase()}/mobileApi/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    throw new Error('refresh failed')
  }
  const data = await res.json()
  if (!data || !data.access) {
    throw new Error('refresh failed')
  }
  tokenStore.setTokens({ access: data.access, refresh: data.refresh })
  return data
}

function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// Shared implementation behind http()/httpMultipart(). `multipart: true` skips
// the auto JSON Content-Type (the caller's `body` is a FormData; the browser
// sets its own `multipart/form-data; boundary=...` header, which a manually
// set Content-Type would break) but otherwise behaves identically — same
// Bearer attachment, same 401-refresh-then-retry, same envelope parsing.
async function request(path, opts, { multipart = false } = {}) {
  const { blob, _isRetry, ...rest } = opts
  const headers = { ...rest.headers }
  const access = tokenStore.getAccess()
  if (access) {
    headers.Authorization = `Bearer ${access}`
  }
  if (!multipart && rest.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${apiBase()}${path}`, { ...rest, headers })

  if (res.status === 401 && !_isRetry) {
    try {
      await refreshOnce()
    } catch {
      tokenStore.clear()
      throw new ApiError(-1, 'session expired', 'SESSION_EXPIRED')
    }
    return request(path, { ...opts, _isRetry: true }, { multipart })
  }

  if (!res.ok) {
    // Try to recover a typed error from a JSON envelope ({code, msg, error})
    // even on non-2xx statuses, since some endpoints answer failures with an
    // HTTP error status AND an envelope body. Fall back to a generic error
    // when the body isn't an envelope (or isn't JSON at all).
    let envelope = null
    try {
      envelope = await res.json()
    } catch {
      envelope = null
    }
    if (envelope && typeof envelope.code === 'number' && envelope.code < 0) {
      throw new ApiError(envelope.code, envelope.msg, envelope.error)
    }
    throw new Error(`API request failed: ${rest.method || 'GET'} ${path} (${res.status})`)
  }

  if (blob) {
    return res.blob()
  }

  const json = await res.json()
  return parseEnvelope(json)
}

export async function http(path, opts = {}) {
  return request(path, opts, { multipart: false })
}

// For multipart/form-data uploads (currently: POST /mobileApi/tickets/file/).
// `opts.body` must be a FormData instance — never set a Content-Type header
// on the caller's side, since that would drop the multipart boundary the
// browser generates for FormData bodies.
export async function httpMultipart(path, opts = {}) {
  return request(path, opts, { multipart: true })
}

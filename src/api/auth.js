// Authentication and account endpoints.
//
// POST /mobileApi/auth/ is the one endpoint in the API that does not follow
// the standard {code, msg, result, error} envelope on success: it returns
// the tokens (and a few user fields) at the TOP LEVEL of the JSON body, with
// no `code` field at all. Routing that through http()/parseEnvelope would
// read `json.result`, which is undefined, and silently lose the tokens. The
// pending-device-verification case is different again: it DOES use the
// envelope shape, with `code: -2` and the tokens nested under `result`.
// Because of this, login() talks to fetch directly instead of going through
// http() (the global constraint explicitly allows a bare fetch in auth.js
// for this reason). Every other call here is a normal enveloped endpoint and
// goes through http() as usual.

import { http } from './client'
import { tokenStore } from './tokenStore'
import { ApiError } from './errors'
import { langToApi } from '../utils/lang'

// Kept in sync with client.js's apiBase() — see its comment for why
// VITE_USE_PROXY forces a relative (proxy-hitting) path in dev.
function apiBase() {
  if (import.meta.env.VITE_USE_PROXY === 'true') return ''
  return import.meta.env.VITE_API_BASE || ''
}

export async function login(username, password) {
  const res = await fetch(`${apiBase()}/mobileApi/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json()

  // Device verification pending: tokens are still issued, but nested in
  // `result` alongside the -2 code rather than at the top level.
  if (json.code === -2) {
    const { access, refresh, ...user } = json.result || {}
    tokenStore.setTokens({ access, refresh })
    return { status: 'verify', user }
  }

  // Any other negative code is a genuine failure (e.g. -3 credentials do not
  // match) with no tokens to store.
  if (typeof json.code === 'number' && json.code < 0) {
    throw new ApiError(json.code, json.msg, json.error)
  }

  // Success: no `code` field, tokens and user fields sit at the top level.
  const { access, refresh, ...user } = json
  tokenStore.setTokens({ access, refresh })
  return { status: 'ok', user }
}

export function verifyCode(code) {
  return http('/mobileApi/auth/verify/', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function sendVerify() {
  return http('/mobileApi/verify/send/', { method: 'POST' })
}

export async function logout() {
  try {
    await http('/mobileApi/logoutAll/', { method: 'POST' })
  } catch {
    // Ignore failure — the local session is cleared unconditionally below.
  }
  tokenStore.clear()
}

// The live /mobileApi/user/ profile has fName/lName (+ fNameEng/lNameEng
// variants) but NO fullname field (Task L1 capture) — compose it here so the
// sidebar footer's name/initials (Sidebar.jsx reads user.fullname) work.
// Eng variants fill in per-part when the local-script part is empty.
export async function getUser() {
  const profile = await http('/mobileApi/user/')
  const fName = profile?.fName || profile?.fNameEng || ''
  const lName = profile?.lName || profile?.lNameEng || ''
  const fullname = `${fName} ${lName}`.trim()
  return { ...profile, fullname: fullname || profile?.fullname || profile?.username || '' }
}

export function patchUserLang(uiLang) {
  return http('/mobileApi/user/', {
    method: 'PATCH',
    body: JSON.stringify({ lang: langToApi(uiLang) }),
  })
}

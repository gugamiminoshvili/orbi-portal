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
import { deviceStore } from './deviceStore'
import { ApiError } from './errors'
import { langToApi } from '../utils/lang'
import { buildDeviceInfo } from '../utils/deviceInfo'

// Kept in sync with client.js's apiBase() — see its comment for why
// VITE_USE_PROXY forces a relative (proxy-hitting) path in dev.
function apiBase() {
  if (import.meta.env.VITE_USE_PROXY === 'true') return ''
  return import.meta.env.VITE_API_BASE || ''
}

export async function login(username, password) {
  // A previously-verified device (Task L2) sends its uuid along so the
  // backend can skip device verification (code:-2) on this login and issue
  // top-level tokens straight away. Omitted entirely for a first-ever login
  // from this browser, where nothing is stored yet.
  const deviceId = deviceStore.getDeviceUuid()
  const body = deviceId ? { username, password, device_id: deviceId } : { username, password }

  const res = await fetch(`${apiBase()}/mobileApi/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

// Registers this browser as a device with the backend (Task L2), so a
// verified device's uuid can later be sent as `device_id` on login to skip
// the verification code entirely. Best-effort: registration failing must
// never block sign-in, so this swallows any error and resolves to null
// rather than throwing.
//
// Reuses a previously-issued device_uuid when one is already stored (e.g. a
// prior registration succeeded but the device was never verified) — the
// backend accepts device_uuid as optional and generates a fresh one only
// when omitted.
export async function registerDevice() {
  try {
    const uuid = await http('/mobileApi/device/', {
      method: 'POST',
      body: JSON.stringify({
        device_uuid: deviceStore.getDeviceUuid() ?? undefined,
        device_info: buildDeviceInfo(),
      }),
    })
    if (uuid) deviceStore.setDeviceUuid(uuid)
    return uuid || null
  } catch {
    return null
  }
}

// Verifies the pending code against BOTH the device (durable — unlocks
// skipping this step on future logins) and the session (what unblocks the
// app right now), per Task L2's ground truth:
//   - POST /mobileApi/device/verify/  {device_uuid, code} — verifies the DEVICE
//   - POST /mobileApi/auth/verify/    {code}               — verifies the SESSION
//
// Device registration happens here (not earlier) only when nothing is
// stored yet, so a fresh device_uuid exists to verify.
//
// FLAG for live testing: whether verifying the device consumes the
// one-time code (so the subsequent auth/verify/ call would then fail with
// CODE_NOT_CORRECT) is UNCONFIRMED. To stay safe under either behavior, both
// calls are attempted unconditionally and the overall result counts as
// success if EITHER succeeds — a device/verify failure never blocks the
// session getting verified. The exported signature stays verifyCode(code)
// unchanged; nothing about it changes for callers.
export async function verifyCode(code) {
  let deviceUuid = deviceStore.getDeviceUuid()
  if (!deviceUuid) {
    deviceUuid = await registerDevice()
  }

  let deviceVerified = false
  if (deviceUuid) {
    try {
      await http('/mobileApi/device/verify/', {
        method: 'POST',
        body: JSON.stringify({ device_uuid: deviceUuid, code }),
      })
      deviceVerified = true
    } catch {
      // Tolerate failure here — e.g. the code was already consumed by the
      // auth/verify/ call below (or vice versa, per the FLAG above).
    }
  }

  try {
    return await http('/mobileApi/auth/verify/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  } catch (err) {
    if (deviceVerified) return null
    throw err
  }
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

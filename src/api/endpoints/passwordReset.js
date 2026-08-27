import { USE_MOCK, delay } from '../client'
import { ApiError } from '../errors'

// The two-step "forgot password" flow (backend guide, 2026-08-27). Public —
// no auth header — and, like the rest of mobileApi, it answers HTTP 200 for
// application-level failures, so `code` in the body is the only signal.
function apiBase() {
  if (import.meta.env.VITE_USE_PROXY === 'true') return ''
  return import.meta.env.VITE_API_BASE || ''
}

async function post(path, body) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new ApiError(-1, 'Malformed response')
  if (json.code < 0) throw new ApiError(json.code, json.msg, json.error)
  return json
}

// Step 1 — e-mail the customer a reset link.
//
// Rate limited to 3 requests per address per minute, and each new request
// invalidates the previous token. The customer must exist AND have a
// personal id; the response deliberately does not distinguish "no such
// customer" from "sent", and neither does the UI — telling a stranger which
// addresses are registered is an account-enumeration gift.
export function requestPasswordReset(email) {
  if (USE_MOCK) return delay().then(() => ({ ok: true }))
  return post('/mobileApi/user/passwordResetEmail/', { email }).then(() => ({ ok: true }))
}

// Step 2a — is this token still good? Used to fail early, before asking
// someone to type a new password twice into a form that cannot succeed.
//
// FLAG (backend guide, same document): the guide reports a bug in the reset
// view — after validating an unused token it looks the same token up with
// `used=1`, which can make the final call fail. If setting the password
// starts failing right after a successful check, that is where to look
// (Profile.py:181). Because of it, this check is best-effort: a failure here
// is reported, but a SUCCESS is not treated as a guarantee.
export function checkResetToken(token) {
  if (USE_MOCK) return delay().then(() => ({ ok: true }))
  return post('/mobileApi/user/reset/', { token, check_pass: false }).then(() => ({ ok: true }))
}

// Step 2b — set the new password. The backend enforces at least 8
// characters with an upper case letter, a lower case letter, a digit and no
// spaces; the form checks the same rules so the user sees them as they type.
export function resetPassword({ token, password, repeatedPassword }) {
  if (USE_MOCK) return delay().then(() => ({ ok: true }))
  return post('/mobileApi/user/reset/', {
    token,
    password,
    repeated_password: repeatedPassword,
  }).then(() => ({ ok: true }))
}

import { USE_MOCK, delay } from '../client'
import { ApiError } from '../errors'

// POST /mobileApi/register2/ — public, multipart, no auth.
//
// This endpoint does NOT use the usual `parseEnvelope` path, for two reasons:
// it answers HTTP 200 even for failures (so the status line says nothing),
// and its most interesting outcome carries `code: 1` together with an
// `error` — a request that was accepted and stored even though no existing
// customer matched. parseEnvelope would return `result` and drop that
// distinction, so the raw envelope is read here instead.
//
// Three outcomes the caller has to tell apart:
//   matched      code 1, no error        — linked to an existing customer
//   unmatched    code 1, CUSTOMER_NOT_MATCHED — saved; ORBI follows up by e-mail
//   failure      code -1                 — thrown as ApiError
function apiBase() {
  if (import.meta.env.VITE_USE_PROXY === 'true') return ''
  return import.meta.env.VITE_API_BASE || ''
}

export async function requestRegistration({
  name,
  lastName,
  tin,
  phone,
  email,
  comment,
  passportFile,
}) {
  if (USE_MOCK) {
    await delay()
    // Mock mirrors the shape, not the matching: whatever is entered comes
    // back as the "saved, not matched yet" case, which is the one the UI has
    // the most to say about.
    return { matched: false, message: null }
  }

  const form = new FormData()
  form.append('name', name)
  form.append('last_name', lastName)
  form.append('tin', tin)
  form.append('phone_number', phone)
  form.append('email', email)
  if (comment) form.append('comment', comment)
  form.append('passport_file', passportFile)

  // No Content-Type header on purpose — the browser has to set it itself so
  // the multipart boundary is included.
  const res = await fetch(`${apiBase()}/mobileApi/register2/`, {
    method: 'POST',
    body: form,
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new ApiError(-1, 'Malformed response')

  if (json.code < 0) throw new ApiError(json.code, json.msg, json.error)
  return {
    matched: json.error !== 'CUSTOMER_NOT_MATCHED',
    message: json.msg || null,
  }
}

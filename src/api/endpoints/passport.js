import { USE_MOCK, delay, httpMultipart } from '../client'

// Re-uploading the passport for an account that already exists.
//
// FLAG: there is no confirmed endpoint for this. /mobileApi/register2/ takes
// `passport_file`, but it registers a NEW customer — it is not a re-upload
// for a signed-in one, and calling it would create a second record. The path
// below is the natural sibling of the fields the customer record already
// carries (`is_passport_valid`, `passport_invalidity_reason`), and it lives
// here so there is exactly one line to correct once the backend names it.
//
// Until then: mock mode runs the whole flow end to end, and live mode fails
// with an error the dialog reports rather than a silent no-op.
const ENDPOINT = '/mobileApi/user/passport/'

export async function uploadPassport(file) {
  if (USE_MOCK) {
    await delay(900)
    return { ok: true }
  }

  const form = new FormData()
  form.append('passport_file', file)
  await httpMultipart(ENDPOINT, { method: 'POST', body: form })
  return { ok: true }
}

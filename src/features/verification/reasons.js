// The five reasons a back-office operator can pick when marking an account
// Invalid. Each one gets its own copy and its own way out, because the way
// out genuinely differs: two are fixed by re-uploading a photo, three can
// only be resolved by talking to someone.
//
// `/mobileApi/user/` sends the reason as `passport_invalidity_reason`, in
// snake_case (`identity_verification_failed`), beside `is_passport_valid`.
// The names below are the back-office labels as supplied, normalised, so
// whichever spelling arrives lands on the right entry; anything
// unrecognised falls back to `generic`, which offers the support route
// rather than guessing at a fix.
// Tone, glyph and the two actions per state — transcribed from the approved
// prototype's META so the dialog's faces match it exactly. `actions` is
// ordered: the first is the primary button, the second the ghost beneath it.
// The wording for each comes from `verification:reasons.<key>.buttons`, in
// the same order.
export const REASONS = {
  not_attached: { tone: 'warn', icon: 'doc-up', actions: [
    { act: 'upload', icon: 'doc-up' }, { act: 'close' }] },
  // Verification is under way. No upload action: a document is already in
  // the queue and a second one would only duplicate the review. The way out
  // is support, for the case where it has genuinely stalled.
  pending: { tone: 'warn', icon: 'clock', actions: [
    { act: 'close' }, { act: 'support', icon: 'headset' }] },
  identity_failed: { tone: 'neg', icon: 'scan', actions: [
    { act: 'upload', icon: 'reload' }, { act: 'close' }] },
  data_mismatch: { tone: 'neg', icon: 'neq', actions: [
    { act: 'upload', icon: 'reload' }, { act: 'support', icon: 'headset' }] },
  company_mismatch: { tone: 'neg', icon: 'building', actions: [
    { act: 'support', icon: 'headset' }, { act: 'close' }] },
  no_ownership: { tone: 'neg', icon: 'home', actions: [
    { act: 'support', icon: 'headset' }, { act: 'close' }] },
  submitted: { tone: 'pos', icon: 'check-circle', actions: [{ act: 'close' }] },
  generic: { tone: 'neg', icon: 'warn', actions: [
    { act: 'support', icon: 'headset' }, { act: 'close' }] },
}

// Back-office label -> key. Matching is done on a squashed, lower-cased form
// so "Passport Not Attached", "PASSPORT_NOT_ATTACHED" and
// "passport-not-attached" all arrive at the same place.
const ALIASES = {
  passportnotattached: 'not_attached',
  notattached: 'not_attached',
  identityverificationfailed: 'identity_failed',
  identityfailed: 'identity_failed',
  userdatamismatch: 'data_mismatch',
  datamismatch: 'data_mismatch',
  personalinformationdoesnotmatchcompanyrecords: 'company_mismatch',
  companymismatch: 'company_mismatch',
  noactiveownership: 'no_ownership',
  noownership: 'no_ownership',
}

export function reasonKey(raw) {
  const squashed = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return ALIASES[squashed] || (REASONS[String(raw ?? '')] ? String(raw) : 'generic')
}

// Support channel for every one of these. One constant, so it cannot drift
// between the modal, the prototype and whatever comes next.
export const SUPPORT_WHATSAPP = '995595071931'

export function whatsappLink(message) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`
}

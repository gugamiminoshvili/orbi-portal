// The five reasons a back-office operator can pick when marking an account
// Invalid. Each one gets its own copy and its own way out, because the way
// out genuinely differs: two are fixed by re-uploading a photo, three can
// only be resolved by talking to someone.
//
// FLAG: `/mobileApi/user/` does not send the reason yet (it does not even
// send the status — README §19). The names below are the back-office labels
// as supplied, normalised, so whichever spelling arrives lands on the right
// entry; anything unrecognised falls back to `generic`, which offers the
// support route rather than guessing at a fix.
export const REASONS = {
  not_attached: { tone: 'warn', icon: 'doc', action: 'upload' },
  identity_failed: { tone: 'neg', icon: 'idcard', action: 'upload' },
  data_mismatch: { tone: 'neg', icon: 'warn', action: 'upload' },
  company_mismatch: { tone: 'neg', icon: 'building', action: 'support' },
  no_ownership: { tone: 'neg', icon: 'home', action: 'support' },
  generic: { tone: 'neg', icon: 'warn', action: 'support' },
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

// Account verification status: shown on the profile page and, when it needs
// the owner's attention, in the header.
//
// This used to fall back to `webAccess` when the payload said nothing, which
// made the card a tautology: `webAccess` is what lets you sign in at all, so
// everyone who could see the card was told "Verified" — including anyone
// whose passport had been rejected. A status nobody can fail is not a
// status. When the backend says nothing, this now says nothing either
// (`null`) and the UI leaves the question alone.
//
// The backend DOES track this: /mobileApi/register2/ takes
// `is_passport_valid` (1 pending, 2 valid, 3 invalid), so the value exists
// on the customer record. It is simply not on GET /mobileApi/user/ yet —
// whose captured keys are id, username, mail, fName, lName, fNameEng,
// lNameEng, personalId, lang, phone, regDate, webAccess, crmId, billingId,
// lastSync, privileged. The moment it appears under any of the spellings
// below, every screen lights up with no further change.
const KNOWN = new Set(['valid', 'pending', 'invalid'])

// `is_passport_valid`'s own numbering, so the field can be passed straight
// through if that is the name it arrives under.
const BY_CODE = { 1: 'pending', 2: 'valid', 3: 'invalid' }

export function accountStatus(user) {
  const code = user?.is_passport_valid ?? user?.isPassportValid
  if (code != null && BY_CODE[Number(code)]) return BY_CODE[Number(code)]

  const explicit = String(user?.accountStatus ?? user?.status ?? '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  if (explicit === 'pendingverification') return 'pending'
  if (KNOWN.has(explicit)) return explicit

  // Nothing to report. Deliberately not 'valid'.
  return null
}

// The header surfaces a status only when it asks something of the owner.
// A verified account is not badged (badging the healthy case trains people
// to ignore the badge), and neither is an unknown one.
export function needsAttention(status) {
  return status === 'pending' || status === 'invalid'
}

export const STATUS_TONE = { valid: 'pos', pending: 'warn', invalid: 'neg' }

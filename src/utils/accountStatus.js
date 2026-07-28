// Account verification status shown on the profile page (always) and in the
// header (only when it needs attention — see below).
//
// FLAG (backend question): the live /mobileApi/user/ payload carries no
// explicit status field — its keys are id, username, mail, fName, lName,
// fNameEng, lNameEng, personalId, lang, phone, regDate, webAccess, crmId,
// billingId, lastSync, privileged. `webAccess` is the only boolean that
// gates portal access, so it's what 'valid' is derived from here. The
// reference portal also shows a PENDING VERIFICATION state; no field in the
// captured payload distinguishes it from plain invalid, so 'pending' is
// only produced when the backend starts sending an explicit status (both
// `status` and `accountStatus` spellings are accepted below).
const KNOWN = new Set(['valid', 'pending', 'invalid'])

export function accountStatus(user) {
  const explicit = String(user?.accountStatus ?? user?.status ?? '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  if (explicit === 'pendingverification') return 'pending'
  if (KNOWN.has(explicit)) return explicit
  return user?.webAccess ? 'valid' : 'invalid'
}

// The header only surfaces a status that needs the owner's attention: once an
// account is verified, permanently badging it "VALID" is noise (owner call).
// The profile page shows the status unconditionally either way.
export function needsAttention(status) {
  return status !== 'valid'
}

export const STATUS_TONE = { valid: 'pos', pending: 'warn', invalid: 'neg' }

// Client-side rules for the registration passport upload — a mirror of what
// POST /mobileApi/register2/ enforces (backend spec, 2026-08-27), checked
// here so the user is told before a 50 MB upload rather than after it.
//
// Deliberately its own policy, not the ticket-attachment one: the server
// accepts a different, much shorter list here, and the two lists have no
// reason to move together.
export const MAX_PASSPORT_BYTES = 50 * 1024 * 1024

const ALLOWED = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'pdf', mime: 'application/pdf' },
  // The browser reports HEIC inconsistently (often as an empty type), which
  // is the reason everything below matches on EXTENSION, as the server does.
  { ext: 'heic', mime: 'image/heic' },
]

export const PASSPORT_EXT = ALLOWED.map((a) => a.ext)

// Both spellings go into <input accept>: some Android pickers honour only
// the MIME list, Safari only the extensions.
export const PASSPORT_ACCEPT = [
  ...new Set(ALLOWED.map((a) => a.mime)),
  ...PASSPORT_EXT.map((e) => `.${e}`),
].join(',')

function extOf(name) {
  return String(name || '').split('.').pop().toLowerCase()
}

// null when the file is fine, otherwise 'type' | 'size'.
export function checkPassportFile(file) {
  if (!file) return 'type'
  if (!PASSPORT_EXT.includes(extOf(file.name))) return 'type'
  if (file.size > MAX_PASSPORT_BYTES) return 'size'
  return null
}

export function formatBytes(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / (1024 * 1024)
  // "50 MB", not "50.0 MB" — a trailing .0 reads like false precision.
  return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`
}

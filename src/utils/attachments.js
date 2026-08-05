// Client-side rules for ticket attachments.
//
// FLAG (README §18): the backend documents `POST /mobileApi/tickets/file/` as
// rejecting with `FILE_TYPE_NOT_ALLOWED`, but never says WHICH types, and
// documents no size limit at all. Both values below are the promise the UI
// has been making since the prototype ("PDF, JPG, PNG · max 5MB"), enforced
// here so the user finds out before the upload rather than after. They are
// deliberately the conservative reading: anything the server would accept but
// we reject is a smaller failure than the reverse. Confirm with the backend
// and widen if needed — the two constants are the only place to change.
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

// Matched against the browser's MIME sniff first, with an extension fallback
// for the cases where a file picked from a phone arrives as
// application/octet-stream.
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png']

// Fed to <input accept>. Both MIME types and extensions, because Safari and
// some Android pickers honour only one or the other.
export const ATTACHMENT_ACCEPT = [...ALLOWED_MIME, ...ALLOWED_EXT.map((e) => `.${e}`)].join(',')

// Shown in the hint beside the button, so the copy can't drift from the rule.
export const ATTACHMENT_TYPE_LABEL = 'PDF, JPG, PNG'

function extensionOf(name = '') {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

// Returns null when the file is acceptable, otherwise 'type' | 'size' — the
// caller turns that into a translated message, since this module has no i18n.
export function checkAttachment(file) {
  if (!file) return 'type'
  const okType = ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(extensionOf(file.name))
  if (!okType) return 'type'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'size'
  return null
}

// Splits a picked FileList into the files worth sending and one translated
// message per rejection. Shared so the chat composer and the new-ticket form
// can't drift into enforcing different rules. `t` is passed in rather than
// imported so this module stays free of the i18n singleton.
export function partitionFiles(fileList, t) {
  const accepted = []
  const errors = []
  for (const file of fileList) {
    const problem = checkAttachment(file)
    if (!problem) {
      accepted.push(file)
    } else {
      errors.push(
        t(problem === 'size' ? 'support:attachSizeError' : 'support:attachTypeError', {
          name: file.name,
          max: formatBytes(MAX_ATTACHMENT_BYTES),
        })
      )
    }
  }
  return { accepted, errors }
}

// Binary units, matching how the API reports its own sizes ("1 Mb").
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(kb / 1024 < 10 ? 1 : 0)} MB`
}

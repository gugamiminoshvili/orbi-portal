// Client-side rules for ticket attachments — a mirror of the backend's own
// `AllowedFileTypes` / `MAX_FILE_SIZE` (supplied by the backend team
// 2026-08-06), enforced here so the user finds out before the upload rather
// than after `FILE_TYPE_NOT_ALLOWED` comes back.
//
// The server validates by EXTENSION, so this does too — matching on the
// browser's MIME sniff would diverge the moment a picker reports
// application/octet-stream (routine for files picked on a phone). The MIME
// strings below exist only to fill <input accept>, which some Android
// pickers honour instead of the extension.
//
// The ceiling was raised to 50 MB across the product (owner call 2026-08-07),
// which also settled the earlier 5-MiB-value-vs-"10 MB"-comment contradiction
// in the backend constant. It applies to both attachment paths: the files
// picked while composing a new ticket, and the ones sent into an open one.
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

// One entry per allowed extension, in the backend's own order. `mime` is
// best-effort — an extension with no reliable MIME (or one the browser won't
// agree on) simply contributes its extension to `accept` and nothing else.
const ALLOWED = [
  { ext: 'png', mime: 'image/png' },
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'heic', mime: 'image/heic' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'tiff', mime: 'image/tiff' },
  { ext: 'bmp', mime: 'image/bmp' },
  { ext: 'mp4', mime: 'video/mp4' },
  { ext: 'avi', mime: 'video/x-msvideo' },
  { ext: 'mov', mime: 'video/quicktime' },
  { ext: 'wmv', mime: 'video/x-ms-wmv' },
  { ext: 'flv', mime: 'video/x-flv' },
  { ext: 'mkv', mime: 'video/x-matroska' },
  { ext: 'pdf', mime: 'application/pdf' },
  { ext: 'doc', mime: 'application/msword' },
  { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'xls', mime: 'application/vnd.ms-excel' },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
]

const ALLOWED_EXT = ALLOWED.map((a) => a.ext)

// Fed to <input accept>. Both forms, because Safari and some Android pickers
// honour only one or the other. Long, but the user never reads it — it is
// what greys out unsupported files in the OS picker, which is the first and
// friendliest place to enforce the rule.
export const ATTACHMENT_ACCEPT = [
  ...new Set(ALLOWED.map((a) => a.mime).filter(Boolean)),
  ...ALLOWED_EXT.map((e) => `.${e}`),
].join(',')

// Eighteen extensions is too many to print beside a button, so the visible
// copy names the three families instead (see `support:attachTypes`) and the
// exact list stays here + in `accept`. Exported for tests and for anywhere
// that needs to state the list in full.
export { ALLOWED_EXT }

function extensionOf(name = '') {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

// Returns null when the file is acceptable, otherwise 'type' | 'size' — the
// caller turns that into a translated message, since this module has no i18n.
export function checkAttachment(file) {
  if (!file) return 'type'
  if (!ALLOWED_EXT.includes(extensionOf(file.name))) return 'type'
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
          types: t('support:attachTypes'),
        })
      )
    }
  }
  return { accepted, errors }
}

// Binary units, matching how the API reports its own sizes ("1 Mb"). A whole
// number of MB prints without a decimal, so the limit reads "50 MB" and not
// "50.0 MB".
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  if (Number.isInteger(mb)) return `${mb} MB`
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

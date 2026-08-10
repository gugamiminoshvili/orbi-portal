import { describe, expect, test } from 'vitest'
import {
  ALLOWED_EXT,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  checkAttachment,
  formatBytes,
  partitionFiles,
} from './attachments'

function file({ name = 'a.pdf', type = 'application/pdf', size = 1000 } = {}) {
  // A plain stand-in: only name/type/size are read, and jsdom's File can't be
  // given an arbitrary size without allocating that many bytes.
  return { name, type, size }
}

test('the list matches the backend AllowedFileTypes verbatim', () => {
  // Supplied by the backend team 2026-08-06. If the server list changes, this
  // is the test that should fail first.
  expect(ALLOWED_EXT).toEqual([
    'png', 'jpg', 'jpeg', 'heic', 'gif', 'tiff', 'bmp',
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
  ])
})

test('the limit is 50 MB', () => {
  // Owner call 2026-08-07, product-wide. Both attachment paths read this one
  // constant, so a new ticket and an open one can never disagree.
  expect(MAX_ATTACHMENT_BYTES).toBe(50 * 1024 * 1024)
})

describe('checkAttachment', () => {
  test('accepts an example from each family', () => {
    expect(checkAttachment(file({ name: 'photo.png', type: 'image/png' }))).toBeNull()
    expect(checkAttachment(file({ name: 'clip.mov', type: 'video/quicktime' }))).toBeNull()
    expect(checkAttachment(file({ name: 'lease.pdf' }))).toBeNull()
    expect(checkAttachment(file({ name: 'report.xlsx' }))).toBeNull()
  })

  test('matches on the extension, not the reported MIME type', () => {
    // The server validates by extension, and pickers routinely report
    // application/octet-stream (or nothing) for a file chosen on a phone.
    expect(checkAttachment(file({ name: 'scan.PDF', type: 'application/octet-stream' }))).toBeNull()
    expect(checkAttachment(file({ name: 'photo.HEIC', type: '' }))).toBeNull()
    // ...and a wrong extension is rejected however the browser labels it.
    expect(checkAttachment(file({ name: 'sneaky.exe', type: 'application/pdf' }))).toBe('type')
  })

  test('rejects an extension outside the list', () => {
    expect(checkAttachment(file({ name: 'notes.txt', type: 'text/plain' }))).toBe('type')
    expect(checkAttachment(file({ name: 'archive.zip' }))).toBe('type')
    expect(checkAttachment(file({ name: 'photo.webp' }))).toBe('type')
    expect(checkAttachment(file({ name: 'noextension' }))).toBe('type')
    expect(checkAttachment(null)).toBe('type')
  })

  test('rejects an allowed type that is over the size limit', () => {
    expect(checkAttachment(file({ size: MAX_ATTACHMENT_BYTES }))).toBeNull()
    expect(checkAttachment(file({ size: MAX_ATTACHMENT_BYTES + 1 }))).toBe('size')
  })
})

test('the accept attribute offers both MIME types and extensions', () => {
  // Safari and some Android pickers honour only one of the two.
  expect(ATTACHMENT_ACCEPT).toContain('application/pdf')
  expect(ATTACHMENT_ACCEPT).toContain('.xlsx')
  // jpg and jpeg share image/jpeg — it should appear once, not twice.
  expect(ATTACHMENT_ACCEPT.split(',').filter((v) => v === 'image/jpeg')).toHaveLength(1)
})

test('formatBytes reports whole units', () => {
  expect(formatBytes(512)).toBe('512 B')
  expect(formatBytes(2048)).toBe('2 KB')
  expect(formatBytes(MAX_ATTACHMENT_BYTES)).toBe('50 MB')
  expect(formatBytes(1.4 * 1024 * 1024)).toBe('1.4 MB')
  expect(formatBytes(undefined)).toBe('')
})

test('partitionFiles splits the batch and explains each rejection', () => {
  const t = (key, opts) => `${key}:${opts?.name ?? ''}`
  const ok = file({ name: 'ok.pdf' })
  const wrongType = file({ name: 'bad.txt', type: 'text/plain' })
  const tooBig = file({ name: 'big.png', type: 'image/png', size: MAX_ATTACHMENT_BYTES + 1 })

  const { accepted, errors } = partitionFiles([ok, wrongType, tooBig], t)

  // One bad file doesn't discard the good ones alongside it.
  expect(accepted).toEqual([ok])
  expect(errors).toEqual(['support:attachTypeError:bad.txt', 'support:attachSizeError:big.png'])
})

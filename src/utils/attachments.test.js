import { describe, expect, test } from 'vitest'
import {
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

describe('checkAttachment', () => {
  test('accepts the documented types by MIME', () => {
    expect(checkAttachment(file({ type: 'application/pdf' }))).toBeNull()
    expect(checkAttachment(file({ name: 'a.jpg', type: 'image/jpeg' }))).toBeNull()
    expect(checkAttachment(file({ name: 'a.png', type: 'image/png' }))).toBeNull()
  })

  test('falls back to the extension when the browser reports no useful type', () => {
    // What a file picked on a phone often looks like.
    expect(checkAttachment(file({ name: 'scan.PDF', type: 'application/octet-stream' }))).toBeNull()
    expect(checkAttachment(file({ name: 'photo.jpeg', type: '' }))).toBeNull()
  })

  test('rejects anything else by type', () => {
    expect(checkAttachment(file({ name: 'notes.txt', type: 'text/plain' }))).toBe('type')
    expect(checkAttachment(file({ name: 'archive.zip', type: 'application/zip' }))).toBe('type')
    expect(checkAttachment(file({ name: 'noextension', type: '' }))).toBe('type')
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
  expect(ATTACHMENT_ACCEPT).toContain('.png')
})

test('formatBytes reports whole units', () => {
  expect(formatBytes(512)).toBe('512 B')
  expect(formatBytes(2048)).toBe('2 KB')
  expect(formatBytes(MAX_ATTACHMENT_BYTES)).toBe('5.0 MB')
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

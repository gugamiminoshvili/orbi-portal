import { http, httpMultipart } from './client'
import { tokenStore } from './tokenStore'
import { ApiError } from './errors'

function jsonResponse(body, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    blob: async () => body,
  }
}

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn()
})

test('attaches Authorization Bearer header when an access token exists', async () => {
  tokenStore.setTokens({ access: 'tok-1', refresh: 'ref-1' })
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'ok', result: { hi: true } }))

  await http('/foo')

  const [, opts] = fetch.mock.calls[0]
  expect(opts.headers.Authorization).toBe('Bearer tok-1')
})

test('omits Authorization header when there is no access token', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'ok', result: [] }))

  await http('/foo')

  const [, opts] = fetch.mock.calls[0]
  expect(opts.headers?.Authorization).toBeUndefined()
})

test('sets JSON Content-Type when a body is present and none is specified', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'ok', result: [] }))

  await http('/foo', { method: 'POST', body: JSON.stringify({ a: 1 }) })

  const [, opts] = fetch.mock.calls[0]
  expect(opts.headers['Content-Type']).toBe('application/json')
})

test('resolves with the parsed result on a successful envelope', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'ok', result: { id: 7 } }))

  const result = await http('/foo')

  expect(result).toEqual({ id: 7 })
})

test('throws ApiError when the envelope code is negative, even on HTTP 200', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({ code: -3, msg: 'credentials do not match', result: [], error: 'CREDENTIALS_DO_NOT_MATCH' })
  )

  await expect(http('/foo')).rejects.toThrow(ApiError)
})

test('blob: true returns the response blob without envelope parsing', async () => {
  const fakeBlob = { size: 3, type: 'application/pdf' }
  fetch.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => fakeBlob })

  const result = await http('/foo', { blob: true })

  expect(result).toBe(fakeBlob)
})

test('non-401, non-ok responses still throw a generic error', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({}, { status: 500, ok: false }))

  await expect(http('/foo')).rejects.toThrow(/500/)
})

test('non-401, non-ok responses with a JSON error envelope throw the typed ApiError', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({ code: -1, msg: 'file not found', result: [], error: undefined }, { status: 404, ok: false })
  )

  try {
    await http('/foo')
    throw new Error('should not reach here')
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe(-1)
    expect(err.message).toBe('file not found')
    expect(err.errorCode).toBeUndefined()
  }
})

test('non-401, non-ok responses fall back to a generic error when the body is not a JSON envelope', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('not json')
    },
  })

  await expect(http('/foo')).rejects.toThrow(/502/)
})

describe('httpMultipart', () => {
  test('attaches Authorization but never sets a Content-Type header (FormData needs its own boundary)', async () => {
    tokenStore.setTokens({ access: 'tok-1', refresh: 'ref-1' })
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'ok', result: 'ticket_file/1/' }))

    const form = new FormData()
    form.append('file', new Blob(['x']), 'x.png')
    form.append('ticketId', '101244')

    const result = await httpMultipart('/mobileApi/tickets/file/', { method: 'POST', body: form })

    expect(result).toBe('ticket_file/1/')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/mobileApi/tickets/file/')
    expect(opts.headers.Authorization).toBe('Bearer tok-1')
    expect(opts.headers['Content-Type']).toBeUndefined()
    expect(opts.body).toBe(form)
  })

  test('reuses the same 401-refresh-then-retry flow as http()', async () => {
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })
    fetch.mockImplementation((url, opts) => {
      if (url.includes('/mobileApi/refresh/')) {
        return Promise.resolve(jsonResponse({ access: 'new-access', refresh: 'new-refresh', user_id: 1 }))
      }
      const usedNewToken = opts?.headers?.Authorization === 'Bearer new-access'
      if (usedNewToken) {
        return Promise.resolve(jsonResponse({ code: 1, msg: 'ok', result: 'ticket_file/2/' }))
      }
      return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
    })

    const form = new FormData()
    const result = await httpMultipart('/mobileApi/tickets/file/', { method: 'POST', body: form })

    expect(result).toBe('ticket_file/2/')
  })
})

describe('401 refresh-on-expiry flow', () => {
  test('refreshes once, then replays the original request with the new token', async () => {
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })

    fetch.mockImplementation((url) => {
      if (url.includes('/mobileApi/refresh/')) {
        return Promise.resolve(
          jsonResponse({ access: 'new-access', refresh: 'new-refresh', user_id: 1 })
        )
      }
      const [, opts] = fetch.mock.calls[fetch.mock.calls.length - 1]
      const usedNewToken = opts.headers?.Authorization === 'Bearer new-access'
      if (usedNewToken) {
        return Promise.resolve(jsonResponse({ code: 1, msg: 'ok', result: { done: true } }))
      }
      return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
    })

    const result = await http('/foo')

    expect(result).toEqual({ done: true })
    expect(tokenStore.getAccess()).toBe('new-access')
    const refreshCalls = fetch.mock.calls.filter(([url]) => url.includes('/mobileApi/refresh/'))
    expect(refreshCalls).toHaveLength(1)
  })

  test('two concurrent 401s trigger exactly one refresh call, both requests retried', async () => {
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })

    fetch.mockImplementation((url, opts) => {
      if (url.includes('/mobileApi/refresh/')) {
        return Promise.resolve(
          jsonResponse({ access: 'new-access', refresh: 'new-refresh', user_id: 1 })
        )
      }
      const usedNewToken = opts?.headers?.Authorization === 'Bearer new-access'
      if (usedNewToken) {
        return Promise.resolve(jsonResponse({ code: 1, msg: 'ok', result: { url } }))
      }
      return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
    })

    const [r1, r2] = await Promise.all([http('/foo'), http('/bar')])

    expect(r1).toEqual({ url: '/foo' })
    expect(r2).toEqual({ url: '/bar' })
    const refreshCalls = fetch.mock.calls.filter(([url]) => url.includes('/mobileApi/refresh/'))
    expect(refreshCalls).toHaveLength(1)
  })

  test('refresh failure clears tokens and throws SESSION_EXPIRED', async () => {
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })

    fetch.mockImplementation((url) => {
      if (url.includes('/mobileApi/refresh/')) {
        return Promise.resolve(jsonResponse({}, { status: 400, ok: false }))
      }
      return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
    })

    await expect(http('/foo')).rejects.toMatchObject({ errorCode: 'SESSION_EXPIRED' })
    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })

  test('the refresh call itself is a raw fetch, not routed back through the 401 handler', async () => {
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })
    let refreshCallCount = 0

    fetch.mockImplementation((url) => {
      if (url.includes('/mobileApi/refresh/')) {
        refreshCallCount += 1
        // Even the refresh endpoint answers 401 here; this must NOT recurse
        // into another refresh attempt.
        return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
      }
      return Promise.resolve(jsonResponse({}, { status: 401, ok: false }))
    })

    await expect(http('/foo')).rejects.toMatchObject({ errorCode: 'SESSION_EXPIRED' })
    expect(refreshCallCount).toBe(1)
  })
})

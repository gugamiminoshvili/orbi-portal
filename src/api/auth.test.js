import { login, verifyCode, sendVerify, logout, getUser, patchUserLang } from './auth'
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

describe('login', () => {
  test('posts credentials to /mobileApi/auth/', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ access: 'a', refresh: 'r', user_id: 1 }))

    await login('bob', 'secret')

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/mobileApi/auth/')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ username: 'bob', password: 'secret' })
  })

  test('stores tokens and returns ok status when the top-level response has no code', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        access: 'acc-1',
        refresh: 'ref-1',
        user_id: 1,
        smsPhone: '+995000000',
        mail: 'a@b.com',
        privileged: false,
      })
    )

    const result = await login('user', 'pass')

    expect(result).toEqual({
      status: 'ok',
      user: { user_id: 1, smsPhone: '+995000000', mail: 'a@b.com', privileged: false },
    })
    expect(tokenStore.getAccess()).toBe('acc-1')
    expect(tokenStore.getRefresh()).toBe('ref-1')
  })

  test('stores tokens and returns verify status when device verification is pending (code:-2)', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        code: -2,
        msg: 'verification pending',
        result: { access: 'acc-2', refresh: 'ref-2', user_id: 5 },
      })
    )

    const result = await login('user', 'pass')

    expect(result).toEqual({ status: 'verify', user: { user_id: 5 } })
    expect(tokenStore.getAccess()).toBe('acc-2')
    expect(tokenStore.getRefresh()).toBe('ref-2')
  })

  test('throws ApiError CREDENTIALS_DO_NOT_MATCH on bad credentials (code:-3) without storing tokens', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        code: -3,
        msg: 'credentials do not match',
        result: [],
        error: 'CREDENTIALS_DO_NOT_MATCH',
      })
    )

    try {
      await login('user', 'wrong')
      throw new Error('should not reach here')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err.code).toBe(-3)
      expect(err.errorCode).toBe('CREDENTIALS_DO_NOT_MATCH')
    }
    expect(tokenStore.hasSession()).toBe(false)
  })
})

test('verifyCode posts the code to /mobileApi/auth/verify/', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

  const result = await verifyCode('123456')

  expect(result).toEqual([])
  const [url, opts] = fetch.mock.calls[0]
  expect(url).toBe('/mobileApi/auth/verify/')
  expect(JSON.parse(opts.body)).toEqual({ code: '123456' })
})

test('sendVerify posts to /mobileApi/verify/send/ with no body', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'verification code was sent', result: [] }))

  await sendVerify()

  const [url, opts] = fetch.mock.calls[0]
  expect(url).toBe('/mobileApi/verify/send/')
  expect(opts.method).toBe('POST')
})

describe('logout', () => {
  test('clears the token store on success', async () => {
    tokenStore.setTokens({ access: 'a', refresh: 'r' })
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

    await logout()

    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/mobileApi/logoutAll/')
    expect(opts.method).toBe('POST')
  })

  test('clears the token store even when the request fails', async () => {
    tokenStore.setTokens({ access: 'a', refresh: 'r' })
    fetch.mockResolvedValueOnce(jsonResponse({}, { status: 500, ok: false }))

    await logout()

    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
})

test('getUser fetches the current user', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: { id: 1, name: 'Bob' } }))

  const user = await getUser()

  expect(user).toEqual({ id: 1, name: 'Bob' })
  const [url] = fetch.mock.calls[0]
  expect(url).toBe('/mobileApi/user/')
})

describe('patchUserLang', () => {
  test('maps the UI language ka to the API language ge before sending', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: { id: 1, lang: 'ge' } }))

    await patchUserLang('ka')

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/mobileApi/user/')
    expect(opts.method).toBe('PATCH')
    expect(JSON.parse(opts.body)).toEqual({ lang: 'ge' })
  })

  test('passes en/ru through unchanged', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: {} }))

    await patchUserLang('ru')

    const [, opts] = fetch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ lang: 'ru' })
  })
})

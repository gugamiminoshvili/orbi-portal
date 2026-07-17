import { login, verifyCode, sendVerify, logout, getUser, patchUserLang, registerDevice } from './auth'
import { tokenStore } from './tokenStore'
import { deviceStore } from './deviceStore'
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

  test('includes device_id in the body when a device uuid is stored (Task L2)', async () => {
    deviceStore.setDeviceUuid('stored-uuid')
    fetch.mockResolvedValueOnce(jsonResponse({ access: 'a', refresh: 'r', user_id: 1 }))

    await login('bob', 'secret')

    const [, opts] = fetch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ username: 'bob', password: 'secret', device_id: 'stored-uuid' })
  })

  test('omits device_id entirely when no device uuid is stored', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ access: 'a', refresh: 'r', user_id: 1 }))

    await login('bob', 'secret')

    const [, opts] = fetch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ username: 'bob', password: 'secret' })
  })
})

describe('registerDevice', () => {
  test('posts device_info (exact field names) to /mobileApi/device/ and stores the returned uuid', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device created successfully', result: 'uuid-123' }))

    const uuid = await registerDevice()

    expect(uuid).toBe('uuid-123')
    expect(deviceStore.getDeviceUuid()).toBe('uuid-123')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/mobileApi/device/')
    const body = JSON.parse(opts.body)
    expect(body.device_uuid).toBeUndefined()
    expect(Object.keys(body.device_info).sort()).toEqual(
      ['device_name', 'device_manufacturer', 'device_model', 'platform'].sort()
    )
  })

  test('sends the already-stored uuid instead of omitting it', async () => {
    deviceStore.setDeviceUuid('existing-uuid')
    fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device created successfully', result: 'existing-uuid' }))

    await registerDevice()

    const [, opts] = fetch.mock.calls[0]
    expect(JSON.parse(opts.body).device_uuid).toBe('existing-uuid')
  })

  test('tolerates failure — resolves to null instead of throwing, and leaves no uuid stored', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ code: -1, msg: 'no customer id', result: [], error: 'NO_CUSTOMER_ID' })
    )

    await expect(registerDevice()).resolves.toBeNull()
    expect(deviceStore.getDeviceUuid()).toBeNull()
  })
})

describe('verifyCode', () => {
  test('registers a device when none is stored, then verifies both the device and the session', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device created successfully', result: 'new-uuid' }))
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device verified successfully', result: [] }))
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

    const result = await verifyCode('123456')

    expect(result).toEqual([])
    expect(deviceStore.getDeviceUuid()).toBe('new-uuid')
    expect(fetch.mock.calls).toHaveLength(3)

    const [deviceUrl] = fetch.mock.calls[0]
    expect(deviceUrl).toBe('/mobileApi/device/')

    const [deviceVerifyUrl, deviceVerifyOpts] = fetch.mock.calls[1]
    expect(deviceVerifyUrl).toBe('/mobileApi/device/verify/')
    expect(JSON.parse(deviceVerifyOpts.body)).toEqual({ device_uuid: 'new-uuid', code: '123456' })

    const [sessionUrl, sessionOpts] = fetch.mock.calls[2]
    expect(sessionUrl).toBe('/mobileApi/auth/verify/')
    expect(JSON.parse(sessionOpts.body)).toEqual({ code: '123456' })
  })

  test('reuses an already-stored device uuid without re-registering', async () => {
    deviceStore.setDeviceUuid('existing-uuid')
    fetch
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device verified successfully', result: [] }))
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

    await verifyCode('654321')

    expect(fetch.mock.calls).toHaveLength(2)
    const [url] = fetch.mock.calls[0]
    expect(url).toBe('/mobileApi/device/verify/')
  })

  test('still verifies the session when device registration fails', async () => {
    fetch
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

    const result = await verifyCode('111111')

    expect(result).toEqual([])
    expect(fetch.mock.calls).toHaveLength(2)
    const [url] = fetch.mock.calls[1]
    expect(url).toBe('/mobileApi/auth/verify/')
  })

  test('still verifies the session when device/verify fails (e.g. an already-consumed code)', async () => {
    deviceStore.setDeviceUuid('existing-uuid')
    fetch
      .mockResolvedValueOnce(
        jsonResponse({ code: -1, msg: 'invalid code', result: [], error: 'INVALID_VERIFICATION_CODE' })
      )
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: [] }))

    const result = await verifyCode('222222')

    expect(result).toEqual([])
  })

  test('resolves (does not throw) when auth/verify fails but device/verify already succeeded', async () => {
    deviceStore.setDeviceUuid('existing-uuid')
    fetch
      .mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'device verified successfully', result: [] }))
      .mockResolvedValueOnce(jsonResponse({ code: -1, msg: 'code not correct', result: [], error: 'CODE_NOT_CORRECT' }))

    const result = await verifyCode('333333')

    expect(result).toBeNull()
  })

  test('throws when both device/verify and auth/verify fail', async () => {
    deviceStore.setDeviceUuid('existing-uuid')
    fetch
      .mockResolvedValueOnce(
        jsonResponse({ code: -1, msg: 'invalid code', result: [], error: 'INVALID_VERIFICATION_CODE' })
      )
      .mockResolvedValueOnce(jsonResponse({ code: -1, msg: 'code not correct', result: [], error: 'CODE_NOT_CORRECT' }))

    await expect(verifyCode('444444')).rejects.toBeInstanceOf(ApiError)
  })
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

test('getUser fetches the current user and composes fullname from fName/lName', async () => {
  // Live /mobileApi/user/ has fName/lName (+ Eng variants), NO fullname —
  // getUser composes it so the sidebar footer works (Task L1).
  fetch.mockResolvedValueOnce(
    jsonResponse({ code: 1, msg: 'success', result: { id: 1, fName: 'Nadiia', lName: 'Pedchenko', username: 'nadiia' } })
  )

  const user = await getUser()

  expect(user).toEqual({ id: 1, fName: 'Nadiia', lName: 'Pedchenko', username: 'nadiia', fullname: 'Nadiia Pedchenko' })
  const [url] = fetch.mock.calls[0]
  expect(url).toBe('/mobileApi/user/')
})

test('getUser falls back to the Eng name variants, then username', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({ code: 1, msg: 'success', result: { id: 2, fName: '', lName: '', fNameEng: 'NADIIA', lNameEng: 'PEDCHENKO' } })
  )
  expect((await getUser()).fullname).toBe('NADIIA PEDCHENKO')

  fetch.mockResolvedValueOnce(jsonResponse({ code: 1, msg: 'success', result: { id: 3, username: 'guga' } }))
  expect((await getUser()).fullname).toBe('guga')
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

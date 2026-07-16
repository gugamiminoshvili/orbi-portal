import { ApiError, parseEnvelope } from './errors'

test('parseEnvelope returns result when code is not negative', () => {
  expect(parseEnvelope({ code: 1, msg: 'ok', result: [1, 2, 3] })).toEqual([1, 2, 3])
})

test('parseEnvelope returns result object as-is', () => {
  const result = { id: 1 }
  expect(parseEnvelope({ code: 1, msg: 'ok', result })).toBe(result)
})

test('parseEnvelope throws ApiError when code is negative', () => {
  expect(() =>
    parseEnvelope({ code: -3, msg: 'credentials do not match', result: [], error: 'CREDENTIALS_DO_NOT_MATCH' })
  ).toThrow(ApiError)
})

test('ApiError carries code, message, and errorCode', () => {
  try {
    parseEnvelope({ code: -3, msg: 'credentials do not match', result: [], error: 'CREDENTIALS_DO_NOT_MATCH' })
    throw new Error('should not reach here')
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe(-3)
    expect(err.message).toBe('credentials do not match')
    expect(err.errorCode).toBe('CREDENTIALS_DO_NOT_MATCH')
  }
})

test('ApiError errorCode is undefined when envelope omits it', () => {
  try {
    parseEnvelope({ code: -1, msg: 'oops', result: [] })
    throw new Error('should not reach here')
  } catch (err) {
    expect(err.errorCode).toBeUndefined()
  }
})

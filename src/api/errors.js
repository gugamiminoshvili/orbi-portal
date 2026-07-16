// API error envelope: every mobileApi JSON response is shaped like
// {code, msg, result, error}. A negative `code` means failure; `error` is an
// optional machine-readable error code used to key translated toast copy.

export class ApiError extends Error {
  constructor(code, msg, errorCode) {
    super(msg)
    this.name = 'ApiError'
    this.code = code
    this.errorCode = errorCode
  }
}

export function parseEnvelope(json) {
  if (json && typeof json.code === 'number' && json.code < 0) {
    throw new ApiError(json.code, json.msg, json.error)
  }
  return json.result
}

// Real-branch tests for src/api/endpoints/locks.js — see news.real.test.js
// for the vi.mock('../client', ...) pattern used to force USE_MOCK false.
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

import { http } from '../client'
import { getLockHistory, downloadElectricityReport } from './locks'
import lockHistory from '../adapters/__fixtures__/lock-history.json'

beforeEach(() => {
  http.mockReset()
})

describe('getLockHistory (real branch)', () => {
  test('sends apartmentId, start_date, end_date as query params and adapts the result', async () => {
    http.mockResolvedValueOnce(lockHistory)
    const result = await getLockHistory(3026, '2026-06-01 00:00:00', '2026-06-30 23:59:59')
    expect(http).toHaveBeenCalledWith(
      '/mobileApi/lockHistory/?apartmentId=3026&start_date=2026-06-01+00%3A00%3A00&end_date=2026-06-30+23%3A59%3A59'
    )
    expect(result.total).toBe(4)
    expect(result.byDay['2026-06-01']).toBe(2)
  })

  test('omits start_date/end_date when not provided', async () => {
    http.mockResolvedValueOnce(lockHistory)
    await getLockHistory(3026)
    expect(http).toHaveBeenCalledWith('/mobileApi/lockHistory/?apartmentId=3026')
  })
})

describe('downloadElectricityReport (real branch)', () => {
  test('requests the PDF via blob:true with flatId/accountType/response_format', async () => {
    const fakeBlob = { size: 42, type: 'application/pdf' }
    http.mockResolvedValueOnce(fakeBlob)

    const result = await downloadElectricityReport(3026)

    expect(http).toHaveBeenCalledWith(
      '/mobileApi/finance/?flatId=3026&accountType=electricity&response_format=pdf',
      { blob: true }
    )
    expect(result).toBe(fakeBlob)
  })
})

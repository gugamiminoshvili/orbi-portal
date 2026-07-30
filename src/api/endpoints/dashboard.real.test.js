// Real-branch tests for src/api/endpoints/dashboard.js — see news.real.test.js
// for the vi.mock('../client', ...) pattern used to force USE_MOCK false.
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

import { http } from '../client'
import { ApiError } from '../errors'
import { getCommunals, getRates, getContractsSummary, getUnpaidInvoices } from './dashboard'
import communals from '../adapters/__fixtures__/dashboard-communals.json'
import currencyRateUSD from '../adapters/__fixtures__/currency-rate.json'
import tournoverNoCrm from '../adapters/__fixtures__/finance-tournover-no-crm.json'
import scheduleFixture from '../adapters/__fixtures__/finance-schedule.json'
import paymentList from '../adapters/__fixtures__/payment-list.json'

beforeEach(() => {
  http.mockReset()
})

describe('getCommunals (real branch)', () => {
  test('GETs /dashboard/communals/ and adapts the result', async () => {
    http.mockResolvedValueOnce(communals)
    const result = await getCommunals()
    expect(http).toHaveBeenCalledWith('/mobileApi/dashboard/communals/')
    expect(result.utilities).toEqual({ electricitySum: 71.38, internetSum: 50, currency: 'GEL' })
    expect(result.byApartment).toHaveLength(4)
  })
})

describe('getRates (real branch)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('GETs currency/rate/ for USD, EUR and GBP with today\'s date and assembles pair labels', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00'))
    http.mockResolvedValue(currencyRateUSD)

    const { rates, source } = await getRates()

    expect(http).toHaveBeenNthCalledWith(1, '/mobileApi/currency/rate/?currency=USD&date=2026-07-17')
    expect(http).toHaveBeenNthCalledWith(2, '/mobileApi/currency/rate/?currency=EUR&date=2026-07-17')
    expect(http).toHaveBeenNthCalledWith(3, '/mobileApi/currency/rate/?currency=GBP&date=2026-07-17')
    expect(http).toHaveBeenCalledTimes(3)
    expect(source).toBe('NBG')
    expect(rates).toEqual([
      { pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 },
      { pair: 'EUR/GEL', rate: 2.6333, delta: -0.0011 },
      { pair: 'GBP/GEL', rate: 2.6333, delta: -0.0011 },
    ])
  })

  test('any failed call makes the whole tile hide (returns null)', async () => {
    http.mockRejectedValue(new Error('network error'))
    expect(await getRates()).toBeNull()
  })

  test('a code:-1 ApiError from one currency also hides the tile', async () => {
    http.mockResolvedValueOnce(currencyRateUSD)
    http.mockRejectedValueOnce(new ApiError(-1, 'date is not valid'))
    http.mockResolvedValueOnce(currencyRateUSD)
    expect(await getRates()).toBeNull()
  })
})

describe('getContractsSummary (real branch)', () => {
  test('adapts a populated tournover/schedule pair', async () => {
    const tournoverDto = {
      deals: { 42: { total: 1000, paid: 400, remain: 600, status: 'Current', overdue: 0, paid_percentage: 40 } },
    }
    http.mockImplementation((path) => {
      if (path === '/mobileApi/finance/tournover/') return Promise.resolve(tournoverDto)
      if (path === '/mobileApi/finance/schedule/') return Promise.resolve(scheduleFixture)
      throw new Error(`unexpected path ${path}`)
    })

    const result = await getContractsSummary()
    expect(result.empty).toBe(false)
    expect(result.deals).toHaveLength(1)
  })

  test('the live crm-less shape (code:1, empty result) resolves {empty: true}', async () => {
    http.mockImplementation((path) => {
      if (path === '/mobileApi/finance/tournover/') return Promise.resolve(tournoverNoCrm.result)
      if (path === '/mobileApi/finance/schedule/') return Promise.resolve(scheduleFixture)
      throw new Error(`unexpected path ${path}`)
    })
    expect(await getContractsSummary()).toEqual({ empty: true })
  })

  test('a thrown ApiError with either CUSTOMER_HAS_NO_CRM(_)ID spelling resolves {empty: true}', async () => {
    http.mockRejectedValueOnce(new ApiError(-1, 'customer has no crmId', 'CUSTOMER_HAS_NO_CRM_ID'))
    expect(await getContractsSummary()).toEqual({ empty: true })

    http.mockReset()
    http.mockRejectedValueOnce(new ApiError(-1, 'customer has no crmId', 'CUSTOMER_HAS_NO_CRMID'))
    expect(await getContractsSummary()).toEqual({ empty: true })
  })

  test('an unrelated ApiError still propagates', async () => {
    http.mockRejectedValueOnce(new ApiError(-1, 'session expired', 'SESSION_EXPIRED'))
    await expect(getContractsSummary()).rejects.toThrow('session expired')
  })
})

describe('getUnpaidInvoices (real branch)', () => {
  test('GETs /payment/ and adapts to {count, invoices}', async () => {
    http.mockResolvedValueOnce(paymentList)
    const result = await getUnpaidInvoices()
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/')
    expect(result.count).toBe(3)
    expect(result.invoices[0].debtAmount).toBe(268.92)
  })
})

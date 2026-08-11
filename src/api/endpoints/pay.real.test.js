// Real-branch tests for payMulti/downloadInvoice in src/api/endpoints/pay.js
// — see news.real.test.js for the vi.mock('../client', ...) pattern used to
// force USE_MOCK false. (v1's payService was removed in Task P3-3 along
// with PayPage, its only caller.)
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

import { http } from '../client'
import { payMulti, downloadInvoice } from './pay'

beforeEach(() => {
  http.mockReset()
})

describe('payMulti (real branch)', () => {
  const services = [{ epcode: '60011519', amount: 100, serviceType: 'apartment' }]

  test('Bank Card -> direct_card:true', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example/x' })
    const result = await payMulti({ services, method: 'card' })
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/multi/', {
      method: 'POST',
      body: JSON.stringify({ services, direct_card: true }),
    })
    expect(result).toEqual({ url: 'https://pay.example/x' })
  })

  test('Apple Pay -> direct_card:true + vendor:applepay', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example/x' })
    await payMulti({ services, method: 'applepay' })
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/multi/', {
      method: 'POST',
      body: JSON.stringify({ services, direct_card: true, vendor: 'applepay' }),
    })
  })

  test('Online Bank -> open_banking:true + vendor:<bankVendor>', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example/x' })
    await payMulti({ services, method: 'bank', bankVendor: 'bog' })
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/multi/', {
      method: 'POST',
      body: JSON.stringify({ services, open_banking: true, vendor: 'bog' }),
    })
  })

  test('Crypto -> crypto:true', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example/x' })
    await payMulti({ services, method: 'crypto' })
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/multi/', {
      method: 'POST',
      body: JSON.stringify({ services, crypto: true }),
    })
  })

  test('Invoice -> as_invoice:true, response passed through as invoice data', async () => {
    const invoiceData = { invoice_id: 555 }
    http.mockResolvedValueOnce(invoiceData)
    const result = await payMulti({ services, method: 'invoice' })
    expect(http).toHaveBeenCalledWith('/mobileApi/payment/multi/', {
      method: 'POST',
      body: JSON.stringify({ services, as_invoice: true }),
    })
    expect(result).toEqual(invoiceData)
  })

  test('an optional lang is added as `language`', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example/x' })
    await payMulti({ services, method: 'card', lang: 'ka' })
    const body = JSON.parse(http.mock.calls[0][1].body)
    expect(body.language).toBe('ka')
  })
})

describe('downloadInvoice (real branch)', () => {
  test('GETs payment/invoice/ with invoice_id + response_type via blob:true', async () => {
    const fakeBlob = { size: 10, type: 'application/pdf' }
    http.mockResolvedValueOnce(fakeBlob)

    const result = await downloadInvoice(19365)

    expect(http).toHaveBeenCalledWith('/mobileApi/payment/invoice/?invoice_id=19365&response_type=pdf', { blob: true })
    expect(result).toBe(fakeBlob)
  })
})

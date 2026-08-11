import { describe, test, expect, vi, afterEach } from 'vitest'
import { openPaymentTab } from './paymentTab'

describe('openPaymentTab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('opens the url in a new tab, severs opener, and returns true', () => {
    const fakeWin = { opener: {} }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin)

    const result = openPaymentTab('https://example.test/pay')

    expect(openSpy).toHaveBeenCalledWith('https://example.test/pay', '_blank')
    expect(fakeWin.opener).toBeNull()
    expect(result).toBe(true)
  })

  test('a popup-blocked open (window.open returns null) returns false', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(openPaymentTab('https://example.test/pay')).toBe(false)
  })
})

// Real-mode tests for PayPage's redirect-based payment flow: with USE_MOCK
// forced false (same vi.mock pattern as src/api/endpoints/*.real.test.js
// and modals.real.test.jsx), Continue must POST /mobileApi/payment/ via
// payService and open the returned url in a new tab — never the mock 3-step
// wizard (that flow's own byte-identical behavior is covered by pay.test.jsx
// and left untouched).
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

vi.mock('../../api/endpoints/apartments', () => ({
  getApartment: vi.fn(),
}))

import { http } from '../../api/client'
import { getApartment } from '../../api/endpoints/apartments'

const APT = {
  id: 501,
  objectId: 3026,
  code: 'OCT.A.30.3026',
  building: 'Orbi City, Block A',
  block: 'A',
  number: '12',
  epcode: 'GE-BAT-OCT-A-3026',
  balance: -95,
}

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  http.mockReset()
  getApartment.mockReset().mockResolvedValue(APT)
})

describe('PayPage (real mode)', () => {
  test('Continue POSTs /mobileApi/payment/ and opens the returned url in a new tab', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example.com/session/abc123' })
    // window.open with the 'noopener' *feature* returns null by spec, which
    // would be indistinguishable from a blocked popup — so PayPage opens a
    // plain '_blank' tab and severs win.opener manually on the handle.
    const fakeWin = { opener: {} }
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => fakeWin)

    renderApp(['/pay/501'])

    expect(await screen.findByText(/₾95\.00/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Continue'))

    expect(await screen.findByText(/Payment window opened/)).toBeInTheDocument()

    const [path, opts] = http.mock.calls[0]
    expect(path).toBe('/mobileApi/payment/')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body).toMatchObject({ epcode: 'GE-BAT-OCT-A-3026', amount: 95, serviceType: 'apartment', lang: 'en' })

    expect(openSpy).toHaveBeenCalledWith('https://pay.example.com/session/abc123', '_blank')
    expect(fakeWin.opener).toBeNull()

    // real mode shows only 2 steps (no Method/Confirm)
    expect(screen.queryByText('Method')).not.toBeInTheDocument()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
    // not the popup-blocked variant
    expect(screen.queryByText(/browser blocked/)).not.toBeInTheDocument()

    openSpy.mockClear()
    fireEvent.click(screen.getByText(/Reopen payment/))
    expect(openSpy).toHaveBeenCalledWith('https://pay.example.com/session/abc123', '_blank')

    openSpy.mockRestore()
  })

  test('rejected payService shows an error toast and re-enables Continue', async () => {
    http.mockRejectedValueOnce(new Error('provider down'))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderApp(['/pay/501'])

    expect(await screen.findByText(/₾95\.00/)).toBeInTheDocument()
    const continueBtn = screen.getByText('Continue').closest('button')
    fireEvent.click(continueBtn)

    expect(await screen.findByText(/Couldn't open the payment page/)).toBeInTheDocument()
    // still on the Amount step, button usable for a retry — not stuck on a spinner
    expect(screen.getByLabelText(/Amount to pay/)).toBeInTheDocument()
    expect(continueBtn).not.toBeDisabled()
    expect(openSpy).not.toHaveBeenCalled()

    openSpy.mockRestore()
  })

  test('popup-blocked window.open (null) renders the blocked fallback copy', async () => {
    http.mockResolvedValueOnce({ url: 'https://pay.example.com/session/abc123' })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderApp(['/pay/501'])

    expect(await screen.findByText(/₾95\.00/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Continue'))

    expect(await screen.findByText(/browser blocked the payment window/)).toBeInTheDocument()
    // the Reopen button stays the clear CTA
    expect(screen.getByText(/Reopen payment/)).toBeInTheDocument()

    openSpy.mockRestore()
  })
})

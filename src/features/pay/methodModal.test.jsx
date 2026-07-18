// Unit tests for MethodModal (Task P3-4) in isolation from the flow —
// payMulti/downloadInvoice are mocked directly (same vi.mock-the-endpoints-
// module pattern as dashboard.test.jsx / modals.real.test.jsx) so the
// method-picker's own gating/body-building logic is exercised without
// depending on ApartmentsStep's selections state.
import { useEffect } from 'react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider, useModal } from '../../context/ModalContext'

vi.mock('../../api/endpoints/pay', () => ({
  payMulti: vi.fn(),
  downloadInvoice: vi.fn(),
}))

import { payMulti, downloadInvoice } from '../../api/endpoints/pay'
import MethodModal from './MethodModal'

const SERVICES = [{ epcode: 'EP1', amount: 30, serviceType: 'electricity' }]

// Goes through the real openModal() (same call site ApartmentsStep uses)
// rather than mounting <MethodModal> as a plain child, so the modal-box
// portal actually exists and closeModal() (the invoice success path, e.g.)
// is observable the same way it is in the real app.
function Harness(props) {
  const { openModal } = useModal()
  useEffect(() => {
    openModal(<MethodModal {...props} />, { size: 'md' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function renderModal(props = {}) {
  return render(
    <ToastProvider>
      <ModalProvider>
        <Harness complexName="Orbi City" utilityLabel="Electricity" amount={30} services={SERVICES} {...props} />
      </ModalProvider>
    </ToastProvider>
  )
}

beforeEach(() => {
  payMulti.mockReset().mockResolvedValue({ url: 'https://example.test/pay' })
  downloadInvoice.mockReset().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  // jsdom has no createObjectURL/revokeObjectURL, and its window.open is an
  // unimplemented stub that logs a console error — stub both so redirect
  // tests are deterministic and quiet; individual tests override window.open
  // with mockReturnValueOnce(null) to exercise the popup-blocked path.
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(window, 'open').mockReturnValue({ opener: {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MethodModal — rendering', () => {
  test('renders the subtitle, amount banner, and all five method options with fee/limit info', () => {
    renderModal()

    expect(screen.getByText('Orbi City • Electricity')).toBeInTheDocument()
    expect(screen.getByText('₾30.00')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Bank Card/ })).toBeInTheDocument()
    expect(screen.getAllByText('Max ₾3,000.00').length).toBe(2) // Bank Card + Apple Pay share the same max
    expect(screen.getAllByText('2.5%').length).toBe(2) // Bank Card + Apple Pay

    expect(screen.getByRole('button', { name: /Apple Pay/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Online Bank/ })).toBeInTheDocument()
    expect(screen.getByText('Max ₾50,000.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crypto/ })).toBeInTheDocument()
    expect(screen.getByText('Max ₾100,000.00')).toBeInTheDocument()
    expect(screen.getAllByText('0.6%').length).toBe(2) // Online Bank + Crypto

    expect(screen.getByRole('button', { name: /Invoice/ })).toBeInTheDocument()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })
})

describe('MethodModal — continue gating', () => {
  test('Continue starts disabled and enables once a non-bank method is chosen', () => {
    renderModal()
    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    expect(continueBtn).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Bank Card/ }))
    expect(continueBtn).not.toBeDisabled()
  })

  test('Online Bank stays gated until a bank is also chosen, and expands/selects with a green highlight (aria-pressed)', () => {
    renderModal()
    const continueBtn = screen.getByRole('button', { name: 'Continue' })

    fireEvent.click(screen.getByRole('button', { name: /Online Bank/ }))
    expect(continueBtn).toBeDisabled()
    expect(screen.getByText('Bank of Georgia')).toBeInTheDocument()
    expect(screen.getByText('TBC Bank')).toBeInTheDocument()
    expect(screen.getByText('Credo Bank')).toBeInTheDocument()
    expect(screen.getByText('Liberty Bank')).toBeInTheDocument()

    const tbcBtn = screen.getByRole('button', { name: /TBC Bank/ })
    expect(tbcBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tbcBtn)
    expect(tbcBtn).toHaveAttribute('aria-pressed', 'true')
    expect(continueBtn).not.toBeDisabled()
  })

  test('an amount over a method\'s max disables that row (with a muted note) and it cannot be selected', () => {
    // 5000 is over Bank Card/Apple Pay's 3000 max but under Online Bank's 50000
    renderModal({ amount: 5000 })

    const cardBtn = screen.getByRole('button', { name: /Bank Card/ })
    expect(cardBtn).toBeDisabled()
    expect(screen.getAllByText("Amount exceeds this method's limit").length).toBe(2) // card + applepay

    fireEvent.click(cardBtn)
    expect(cardBtn).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    // Online Bank is still selectable at 5000
    fireEvent.click(screen.getByRole('button', { name: /Online Bank/ }))
    expect(screen.getByRole('button', { name: /Online Bank/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MethodModal — payMulti body per method', () => {
  test('Bank Card -> method "card", no bankVendor', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Bank Card/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText(/Payment opened/)
    expect(payMulti).toHaveBeenCalledWith(
      expect.objectContaining({ services: SERVICES, method: 'card', bankVendor: undefined })
    )
  })

  test('Online Bank + TBC -> method "bank" with bankVendor "tbc"', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Online Bank/ }))
    fireEvent.click(screen.getByRole('button', { name: /TBC Bank/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText(/Payment opened/)
    expect(payMulti).toHaveBeenCalledWith(
      expect.objectContaining({ services: SERVICES, method: 'bank', bankVendor: 'tbc' })
    )
  })

  test('Crypto -> method "crypto"', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Crypto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText(/Payment opened/)
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ method: 'crypto' }))
  })

  test('a popup-blocked redirect shows the blocked copy and Reopen retries the same url', async () => {
    vi.spyOn(window, 'open').mockReturnValueOnce(null).mockReturnValueOnce({ opener: {} })
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Bank Card/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(/browser blocked the popup/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reopen/ }))
    expect(await screen.findByText(/Complete your payment/)).toBeInTheDocument()
  })
})

describe('MethodModal — invoice branch', () => {
  test('Invoice -> payMulti(method:"invoice"), then downloadInvoice, saves a blob, toasts, and closes', async () => {
    payMulti.mockResolvedValueOnce({ invoiceId: 42 })
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /Invoice/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Invoice downloaded')).toBeInTheDocument()
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ services: SERVICES, method: 'invoice' }))
    expect(downloadInvoice).toHaveBeenCalledWith(42)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(screen.queryByTestId('modal-box')).not.toBeInTheDocument()
  })
})

describe('MethodModal — failure handling', () => {
  test('a rejected payMulti shows a generic failure toast and re-enables Continue', async () => {
    payMulti.mockRejectedValueOnce(new Error('down'))
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /Bank Card/ }))
    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(continueBtn)

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(continueBtn).not.toBeDisabled()
    expect(screen.getByTestId('modal-box')).toBeInTheDocument() // stayed open for a retry
  })

  test('a rejected downloadInvoice on the invoice branch also shows the failure toast', async () => {
    downloadInvoice.mockRejectedValueOnce(new Error('down'))
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /Invoice/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(screen.getByTestId('modal-box')).toBeInTheDocument()
  })
})

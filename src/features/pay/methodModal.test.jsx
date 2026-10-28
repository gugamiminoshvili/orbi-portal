// Unit tests for MethodModal in isolation from the flow: the endpoints are
// mocked so the picker's own list, gating and request-building are exercised
// without ApartmentsStep's selections.
import { useEffect } from 'react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider, useModal } from '../../context/ModalContext'

vi.mock('../../api/endpoints/pay', () => ({
  payMulti: vi.fn(),
  downloadInvoice: vi.fn(),
  getPaymentMethods: vi.fn(),
}))

import { payMulti, downloadInvoice, getPaymentMethods } from '../../api/endpoints/pay'
import MethodModal from './MethodModal'

const SERVICES = [{ epcode: 'EP1', amount: 30, serviceType: 'electricity' }]

// As GET /paymentMethods/ arrives after adaptPaymentMethods: two card rows
// with different limits, Apple Pay, crypto, and an online bank with a fee cap.
// No invoice row - the modal adds it itself.
const METHODS = [
  { id: 1, key: 'card', name: 'Card', title: 'Pay by card', max: 1500, feePct: 2, maxFee: null },
  { id: 2, key: 'card', name: 'Card', title: 'Pay by card', max: 3000, feePct: 2.5, maxFee: null },
  { id: 3, key: 'applepay', name: 'Apple Pay', title: 'Apple Pay', max: 3000, feePct: 2.5, maxFee: null },
  { id: 4, key: 'crypto', name: 'Crypto', title: 'Crypto', max: 50000, feePct: 0.6, maxFee: null },
  { id: 5, key: 'bank', name: 'Online bank', title: 'Online bank', max: 50000, feePct: 0.6, maxFee: 100 },
]

// Through the real openModal(), so the modal box and closeModal() behave as in the app.
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

// The rows, in order, once the list has loaded.
async function rows() {
  await screen.findAllByRole('button', { name: /Bank Card/ })
  return screen.getAllByRole('button', { pressed: false }).concat(screen.queryAllByRole('button', { pressed: true }))
}

beforeEach(() => {
  getPaymentMethods.mockReset().mockResolvedValue(METHODS)
  payMulti.mockReset().mockResolvedValue({ url: 'https://example.test/pay' })
  downloadInvoice.mockReset().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(window, 'open').mockReturnValue({ opener: {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MethodModal - list', () => {
  test('title, subtitle, the amount panel, and one row per method with its limit and fee', async () => {
    renderModal()
    await rows()
    expect(screen.getByText('Select Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Orbi City • Electricity')).toBeInTheDocument()
    expect(screen.getByText('Initial Amount')).toBeInTheDocument()
    expect(screen.getByText('30.00 ₾')).toBeInTheDocument()

    const cards = screen.getAllByRole('button', { name: /Bank Card/ })
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Max 1,500 ₾')
    expect(cards[0]).toHaveTextContent('Fee 2.0 %')
    expect(cards[1]).toHaveTextContent('Max 3,000 ₾')
    expect(cards[1]).toHaveTextContent('Fee 2.5 %')
    // The fee cap, where there is one.
    expect(screen.getByRole('button', { name: /Online Bank/ })).toHaveTextContent('Max fee 100 ₾')
    // The invoice is offered even though the list did not carry it.
    expect(screen.getByRole('button', { name: /Invoice/ })).toHaveTextContent('Download')
  })

  test('no fee or total breakdown - only a hint until a method is picked', async () => {
    renderModal()
    await rows()
    expect(screen.getByText('Select a payment method above to continue')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Total$/)).not.toBeInTheDocument()
  })

  test('a method over its limit is disabled and cannot be picked', async () => {
    renderModal({ amount: 2000 })
    await rows()
    const [small, big] = screen.getAllByRole('button', { name: /Bank Card/ })
    expect(small).toBeDisabled()
    fireEvent.click(small)
    expect(small).toHaveAttribute('aria-pressed', 'false')
    expect(big).not.toBeDisabled()
  })

  test('a failed list shows a retry that loads it again', async () => {
    getPaymentMethods.mockRejectedValueOnce(new Error('down'))
    renderModal()
    fireEvent.click(await screen.findByRole('button', { name: /Retry/ }))
    expect(await screen.findAllByRole('button', { name: /Bank Card/ })).toHaveLength(2)
    expect(getPaymentMethods).toHaveBeenCalledTimes(2)
  })
})

describe('MethodModal - paying', () => {
  test('the picked row is sent by its id: the second card row pays as method "card", id 2', async () => {
    renderModal()
    await rows()
    const card2 = screen.getAllByRole('button', { name: /Bank Card/ })[1]
    fireEvent.click(card2)
    expect(card2).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Payment opened in a new tab')).toBeInTheDocument()
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ services: SERVICES, method: 'card', methodId: 2, bankVendor: undefined }))
    expect(window.open).toHaveBeenCalledWith('https://example.test/pay', '_blank')
  })

  test('crypto pays as method "crypto"', async () => {
    renderModal()
    await rows()
    fireEvent.click(screen.getByRole('button', { name: /Crypto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Payment opened in a new tab')
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ method: 'crypto', methodId: 4 }))
  })

  test('online bank opens its banks; picking one pays straight away', async () => {
    renderModal()
    await rows()
    fireEvent.click(screen.getByRole('button', { name: /Online Bank/ }))
    // No Continue - the bank itself is the next step.
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    const banks = screen.getByRole('group', { name: 'Choose your bank' })
    fireEvent.click(within(banks).getByRole('button', { name: /TBC Bank/ }))
    await screen.findByText('Payment opened in a new tab')
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ method: 'bank', methodId: 5, bankVendor: 'tbc' }))
  })

  test('a popup-blocked redirect shows the blocked copy and Reopen retries the same url', async () => {
    window.open.mockReturnValueOnce(null)
    renderModal()
    await rows()
    fireEvent.click(screen.getByRole('button', { name: /Crypto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Payment window blocked')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reopen/ }))
    expect(await screen.findByText('Payment opened in a new tab')).toBeInTheDocument()
    expect(window.open).toHaveBeenCalledTimes(2)
  })

  test('invoice: Download asks for the invoice, saves the PDF, toasts and closes', async () => {
    renderModal()
    await rows()
    payMulti.mockResolvedValueOnce({ invoice_id: 77 })
    fireEvent.click(screen.getByRole('button', { name: /Invoice/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(await screen.findByText('Invoice downloaded')).toBeInTheDocument()
    expect(payMulti).toHaveBeenCalledWith(expect.objectContaining({ method: 'invoice' }))
    expect(downloadInvoice).toHaveBeenCalledWith(77)
    expect(screen.queryByTestId('modal-box')).not.toBeInTheDocument()
  })

  test('a rejected payment toasts and leaves Continue usable', async () => {
    payMulti.mockRejectedValueOnce(new Error('boom'))
    renderModal()
    await rows()
    fireEvent.click(screen.getByRole('button', { name: /Crypto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
  })

  test('ESC cannot dismiss the modal while the payment is in flight', async () => {
    let resolvePay
    payMulti.mockImplementationOnce(() => new Promise((resolve) => { resolvePay = resolve }))
    renderModal()
    await rows()
    fireEvent.click(screen.getByRole('button', { name: /Crypto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('modal-box')).toBeInTheDocument()
    resolvePay({ url: 'https://example.test/pay' })
    expect(await screen.findByText('Payment opened in a new tab')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('modal-box')).not.toBeInTheDocument()
  })
})

import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

// Stub the data layer so the sums are deterministic and independent of the
// mock fixtures — same vi.mock-the-endpoints-module pattern used elsewhere.
vi.mock('../../api/endpoints/dashboard', () => ({
  getCommunals: vi.fn(),
  getRates: vi.fn(),
  getContractsSummary: vi.fn(),
  getUnpaidInvoices: vi.fn(),
}))
import { getCommunals, getRates } from '../../api/endpoints/dashboard'

const COMMUNALS = {
  utilities: { electricitySum: 71.38, internetSum: 50, currency: 'GEL' },
  maintenance: { owed: 657.71, advance: -637.12, currency: 'USD' },
  byApartment: [],
}
const RATES = { rates: [{ pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 }], source: 'NBG' }

function renderApp(entries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

// Scoped to the debt card: "Service" and "Internet" now also appear in the
// rail and in the guide link cards, so a bare getByText would be ambiguous.
const rowFor = (label) =>
  [...document.querySelectorAll('.debt-list li, ul li')]
    .find((li) => li.textContent.startsWith(label))

beforeEach(() => {
  getCommunals.mockReset().mockResolvedValue(COMMUNALS)
  getRates.mockReset().mockResolvedValue(RATES)
})

describe('DashboardPage — the debt card', () => {
  test('shows one cell per debt type, every figure converted to GEL', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    // 657.71 USD at 2.6333 = 1,731.95 GEL. The dollar sign is gone from the
    // card entirely — one currency, the owner's 2026-09-03 call.
    expect(within(rowFor('Service')).getByText('1,731.95')).toBeInTheDocument()
    expect(screen.queryByText('$')).not.toBeInTheDocument()
    expect(within(rowFor('Electricity')).getByText('71.38')).toBeInTheDocument()
    // The backend's own internet_debt_sum, read verbatim.
    expect(within(rowFor('Internet')).getByText('50.00')).toBeInTheDocument()
  })

  test('the three lines add up to one stated total', async () => {
    renderApp()
    await screen.findByText('All debts in one place')

    // 1,731.95 + 71.38 + 50.00 — a sum that only exists because everything
    // is in GEL.
    const total = document.querySelector('[data-total] [data-state]')
    expect(total).toHaveTextContent('1,853.33')
    expect(total).toHaveAttribute('data-state', 'owed')
  })

  test('the bar carries one segment per debt that is actually owed', async () => {
    renderApp()
    await screen.findByText('All debts in one place')

    // Electricity and internet both owe here, so all three are drawn; their
    // widths are shares of what is owed, not of the signed total.
    const bar = document.querySelector('[data-bar]')
    expect(bar.children).toHaveLength(3)
    expect(Number(bar.children[0].style.width.replace('%', ''))).toBeCloseTo(93.45, 2)
  })

  test('a credit leaves the bar empty rather than drawing a negative slice', async () => {
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
      maintenance: { owed: -40, advance: 0, currency: 'USD' },
      byApartment: [],
    })
    renderApp()
    await screen.findByText('All debts in one place')

    expect(document.querySelector('[data-bar]').children).toHaveLength(0)
    expect(document.querySelector('[data-total] [data-state]'))
      .toHaveAttribute('data-state', 'ahead')

    getCommunals.mockResolvedValue(COMMUNALS)
  })

  test('colour states: owed, settled, and paid ahead', async () => {
    getCommunals.mockResolvedValue({
      ...COMMUNALS,
      utilities: { ...COMMUNALS.utilities, electricitySum: 0 },
      maintenance: { owed: -40, advance: 0, currency: 'USD' },
    })
    renderApp()
    await screen.findByText('All debts in one place')

    // -40 USD at 2.6333 = -105.33 GEL.
    expect(within(rowFor('Service')).getByText('-105.33').closest('[data-state]'))
      .toHaveAttribute('data-state', 'ahead')
    expect(within(rowFor('Electricity')).getByText('0.00').closest('[data-state]'))
      .toHaveAttribute('data-state', 'settled')

    getCommunals.mockResolvedValue(COMMUNALS)
  })

  test('Pay is a link to /pay and is never disabled — paying ahead is allowed', async () => {
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
      maintenance: { owed: 0, advance: 0, currency: 'USD' },
      byApartment: [],
    })
    renderApp()

    const pay = await screen.findByRole('link', { name: /Pay/ })
    expect(pay).toHaveAttribute('href', '/pay')
    expect(pay).not.toHaveAttribute('aria-disabled')

    getCommunals.mockResolvedValue(COMMUNALS)
  })
})

describe('DashboardPage — the rest of the page', () => {
  test('renders the exchange rates with four decimals', async () => {
    renderApp()
    expect(await screen.findByText("Today's Exchange Rates")).toBeInTheDocument()
    expect(screen.getByText('1 USD / GEL')).toBeInTheDocument()
    expect(screen.getByText('2.6333')).toBeInTheDocument()
    expect(screen.getByText(/Source: NBG/)).toBeInTheDocument()
  })

  test('hides the exchange-rates card when rates are unavailable', async () => {
    getRates.mockResolvedValue(null)
    renderApp()
    await screen.findByText('All debts in one place')
    expect(screen.queryByText("Today's Exchange Rates")).not.toBeInTheDocument()
  })

  test('the three link cards point at the existing guide pages', async () => {
    renderApp()
    await screen.findByText('All debts in one place')
    // /Service/ also matches the sidebar's own guide row, so scope to the card.
    expect(screen.getByText('Manage your service contracts and payments').closest('a'))
      .toHaveAttribute('href', '/guides/service')
    expect(screen.getByText('View handover documents and related information').closest('a'))
      .toHaveAttribute('href', '/guides/handover')
    expect(screen.getByText('Manage authorized persons and permissions').closest('a'))
      .toHaveAttribute('href', '/guides/power-of-attorney')
  })

  test('Contact Centre: View All opens the ticket list, Contact Us a new ticket', async () => {
    renderApp()
    await screen.findByText(/Our team is here to help you/)
    const card = screen.getByText(/Our team is here to help you/).closest('[class*="wide-card"]')
    expect(within(card).getByRole('link', { name: /View All/ })).toHaveAttribute('href', '/support')
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/support/new')
  })

  test('Rules & Regulations offers one way in, not two', async () => {
    renderApp()
    await screen.findByText(/Important information about building rules/)
    const card = screen
      .getByText(/Important information about building rules/)
      .closest('[class*="wide-card"]')
    expect(within(card).getByRole('link', { name: /View All/ })).toHaveAttribute('href', '/rules')
    // "Read Now" pointed at /rules too, so it was a second route to the same
    // page and nothing else (owner call 2026-09-03).
    expect(screen.queryByText('Read Now')).not.toBeInTheDocument()
    expect(within(card).getAllByRole('link')).toHaveLength(1)
  })

  test('what the redesign removed is gone', async () => {
    renderApp()
    await screen.findByText('All debts in one place')
    for (const gone of [
      'Contracts', 'Active offers', 'Additional contracts',
      'Request maintenance', 'Contact support', 'Unpaid invoices',
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument()
    }
  })
})

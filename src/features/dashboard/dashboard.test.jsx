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
vi.mock('../../api/endpoints/apartments', () => ({
  listApartments: vi.fn(),
}))

import { getCommunals, getRates } from '../../api/endpoints/dashboard'
import { listApartments } from '../../api/endpoints/apartments'

const COMMUNALS = {
  utilities: { electricitySum: 71.38, internetSum: 50, currency: 'GEL' },
  maintenance: { owed: 657.71, advance: -637.12, currency: 'USD' },
  byApartment: [],
}
const RATES = { rates: [{ pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 }], source: 'NBG' }

// Internet is prepaid: only an agreement with under 14 days left is due, and
// what falls due is its tariff plus any penalty.
const APARTMENTS = [
  { id: 'A1', services: { internet: { planId: 7, daysLeft: 3, tariff: 45, penalty: 5 } } },
  { id: 'A2', services: { internet: { planId: 7, daysLeft: 20, tariff: 60, penalty: 0 } } },
  { id: 'A3', services: { internet: { planId: null, daysLeft: 0, tariff: 0, penalty: 0 } } },
]

function renderApp(entries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

const rowFor = (label) => screen.getByText(label).closest('li')

beforeEach(() => {
  getCommunals.mockReset().mockResolvedValue(COMMUNALS)
  getRates.mockReset().mockResolvedValue(RATES)
  listApartments.mockReset().mockResolvedValue(APARTMENTS)
})

describe('DashboardPage — the debt card', () => {
  test('shows one row per debt type, each in its own currency', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    expect(within(rowFor('Service Debt')).getByText('657.71')).toBeInTheDocument()
    expect(within(rowFor('Service Debt')).getByText('$')).toBeInTheDocument()
    expect(within(rowFor('Electricity Debt')).getByText('71.38')).toBeInTheDocument()
    // 45 + 5 from the apartment with 3 days left; the 20-day one owes nothing.
    expect(within(rowFor('Internet Debt')).getByText('50.00')).toBeInTheDocument()
  })

  test('the donut states only the word Total — no cross-currency number', async () => {
    renderApp()
    await screen.findByText('Service Debt')

    expect(screen.getByText('Total')).toBeInTheDocument()
    // 657.71 USD + 71.38 GEL has no meaningful sum, and none is printed.
    expect(screen.queryByText('729.09')).not.toBeInTheDocument()
    expect(screen.queryByText(/1,\d{3}\.\d{2}/)).not.toBeInTheDocument()
  })

  test('colour states: owed, settled, and paid ahead', async () => {
    getCommunals.mockResolvedValue({
      ...COMMUNALS,
      utilities: { ...COMMUNALS.utilities, electricitySum: 0 },
      maintenance: { owed: -40, advance: 0, currency: 'USD' },
    })
    listApartments.mockResolvedValue([])
    renderApp()
    await screen.findByText('Service Debt')

    expect(within(rowFor('Service Debt')).getByText('-40.00').closest('[data-state]'))
      .toHaveAttribute('data-state', 'ahead')
    expect(within(rowFor('Electricity Debt')).getByText('0.00').closest('[data-state]'))
      .toHaveAttribute('data-state', 'settled')

    getCommunals.mockResolvedValue(COMMUNALS)
  })

  test('Pay is a link to /pay and is never disabled — paying ahead is allowed', async () => {
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
      maintenance: { owed: 0, advance: 0, currency: 'USD' },
      byApartment: [],
    })
    listApartments.mockResolvedValue([])
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
    await screen.findByText('Service Debt')
    expect(screen.queryByText("Today's Exchange Rates")).not.toBeInTheDocument()
  })

  test('the three link cards point at the existing guide pages', async () => {
    renderApp()
    await screen.findByText('Service Debt')
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
    await screen.findByText('Contact Centre')
    expect(screen.getByRole('link', { name: /View All/ })).toHaveAttribute('href', '/support')
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/support/new')
  })

  test('Rules & Regulations has no destination yet, so its actions are not links', async () => {
    renderApp()
    await screen.findByText('Rules & Regulations')
    // Exactly one "View All" is a link (Contact Centre's); Rules' is inert.
    expect(screen.getAllByText('View All')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /View All/ })).toHaveLength(1)
    expect(screen.getByText('Read Now').closest('a')).toBeNull()
  })

  test('what the redesign removed is gone', async () => {
    renderApp()
    await screen.findByText('Service Debt')
    for (const gone of [
      'Contracts', 'Active offers', 'Additional contracts',
      'Request maintenance', 'Contact support', 'Unpaid invoices',
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument()
    }
  })
})

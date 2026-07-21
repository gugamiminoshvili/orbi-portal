import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

// Stub the data layer (Task P3-1) so the Dashboard's sums/zero-states are
// deterministic and independent of the mock/services fixtures — same
// vi.mock-the-endpoints-module pattern as pay.real.test.jsx, but here it's
// used to control mock-mode-shaped data rather than to force real mode.
vi.mock('../../api/endpoints/dashboard', () => ({
  getCommunals: vi.fn(),
  getRates: vi.fn(),
  getContractsSummary: vi.fn(),
  getUnpaidInvoices: vi.fn(),
}))

import { getCommunals, getRates, getContractsSummary, getUnpaidInvoices } from '../../api/endpoints/dashboard'

const COMMUNALS = {
  utilities: { electricitySum: 71.38, internetSum: 50, currency: 'GEL' },
  maintenance: { sum: 657.71, debtSum: -637.12, currency: 'USD' },
  byApartment: [],
}
const RATES = { rates: [{ pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 }], source: 'NBG' }
const CONTRACTS_WITH_DEALS = { empty: false, deals: [{ id: 1 }, { id: 2 }], schedule: [] }
const CONTRACTS_EMPTY = { empty: true }
const UNPAID = { count: 3, invoices: [] }

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
  getCommunals.mockReset().mockResolvedValue(COMMUNALS)
  getRates.mockReset().mockResolvedValue(RATES)
  getContractsSummary.mockReset().mockResolvedValue(CONTRACTS_WITH_DEALS)
  getUnpaidInvoices.mockReset().mockResolvedValue(UNPAID)
})

describe('DashboardPage', () => {
  test('renders maintenance/utilities sums (each native currency, no merged total), rates, contracts count, and unpaid badge', async () => {
    renderApp(['/dashboard'])

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    // maintenance debt = abs(debtSum), not the credit-only `sum` field —
    // rendered both in the debt-card line and the Maintenance stat tile.
    expect(screen.getAllByText('$637.12').length).toBeGreaterThan(0)
    // utilities = electricitySum + internetSum = 121.38 — same, two spots.
    expect(screen.getAllByText('₾121.38').length).toBeGreaterThan(0)
    // No merged cross-currency total (owner request 2026-07-21): the two
    // currencies stay on their own lines, nothing shows the old $683.21.
    expect(screen.queryByText('$683.21')).not.toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()

    expect(screen.getByText('USD / GEL')).toBeInTheDocument()
    expect(screen.getByText(/Source: NBG/)).toBeInTheDocument()

    expect(screen.getByText('2 contracts')).toBeInTheDocument()
    expect(screen.getByText('3 invoices')).toBeInTheDocument()
  })

  test('shows each balance in its native currency when maintenance.currency is GEL', async () => {
    // Mock mode's real getCommunals() reports maintenance.currency 'GEL'
    // (mockCommunals' comment explains why) — this pins that branch with a
    // stubbed payload so the assertion doesn't depend on the live mock
    // fixture's exact numbers.
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 71.38, internetSum: 50, currency: 'GEL' },
      maintenance: { sum: 100, debtSum: -300, currency: 'GEL' },
      byApartment: [],
    })
    renderApp(['/dashboard'])

    await screen.findByRole('heading', { name: 'Dashboard' })

    // maintenance debt = abs(-300) = 300, shown in ₾ (not $) — two spots.
    expect(screen.getAllByText('₾300.00').length).toBeGreaterThan(0)
    // utilities = 71.38 + 50 = 121.38 — same as the USD-branch fixture.
    expect(screen.getAllByText('₾121.38').length).toBeGreaterThan(0)
    // No merged total row (owner request 2026-07-21) — neither the summed
    // figure nor a "Total" label is rendered.
    expect(screen.queryByText('₾421.38')).not.toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })

  test('hides the exchange-rates card when rates are unavailable', async () => {
    getRates.mockResolvedValue(null)
    renderApp(['/dashboard'])

    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.getAllByText('$637.12').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₾121.38').length).toBeGreaterThan(0)
    expect(screen.queryByText('Exchange rates')).not.toBeInTheDocument()
  })

  test('shows the Contracts tile zero-state when the account has no CRM id', async () => {
    getContractsSummary.mockResolvedValue(CONTRACTS_EMPTY)
    renderApp(['/dashboard'])

    expect(await screen.findByText('No active contracts')).toBeInTheDocument()
  })

  test('bottom action cards link to /pay, /support/new, and /support', async () => {
    renderApp(['/dashboard'])
    await screen.findByRole('heading', { name: 'Dashboard' })

    expect(screen.getByText('Settle your maintenance and utility balances').closest('a')).toHaveAttribute(
      'href',
      '/pay'
    )
    expect(screen.getByText('Open a new maintenance ticket').closest('a')).toHaveAttribute('href', '/support/new')
    expect(screen.getByText('Chat with the ORBI support team').closest('a')).toHaveAttribute('href', '/support')

    // "Pay Now" appears twice — the Total-debt card's own button and the
    // bottom action card's title — both must target /pay.
    const payNowLinks = screen.getAllByText('Pay Now')
    expect(payNowLinks.length).toBe(2)
    for (const link of payNowLinks) {
      expect(link.closest('a')).toHaveAttribute('href', '/pay')
    }
  })

  test('root and unknown paths redirect into the dashboard', async () => {
    renderApp(['/'])
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

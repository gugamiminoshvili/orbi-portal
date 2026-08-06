import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { AppRoutes } from '../../routes'

// Stub the data layer (same vi.mock-the-endpoints-module pattern as
// dashboard.test.jsx) so the complex/utility grouping and owed amounts are
// deterministic. Two complexes: "Orbi City" (2 apartments, one owing on all
// 3 utilities, one all in advance) and "Orbi Sea Towers" (1 apartment, owing
// electricity only). Positive = owed (utils/balance.js) — see owedFor's
// sign convention this fixture leans on.
vi.mock('../../api/endpoints/dashboard', () => ({
  getCommunals: vi.fn(),
  getRates: vi.fn(),
}))
vi.mock('../../api/endpoints/apartments', () => ({
  listApartments: vi.fn(),
}))
// payMulti is mocked (rather than letting the real module's mock-mode branch
// run) so the P3-4 wiring tests can assert the exact request body
// ApartmentsStep builds from its selections; the default resolved {url}
// mirrors the real mock branch, so the redirect-open tests behave the same.
vi.mock('../../api/endpoints/pay', () => ({
  payMulti: vi.fn(),
  downloadInvoice: vi.fn(),
}))

import { getCommunals, getRates } from '../../api/endpoints/dashboard'
import { listApartments } from '../../api/endpoints/apartments'
import { payMulti } from '../../api/endpoints/pay'

const APARTMENTS = [
  { id: 'A1', code: 'OCT.A.30.3026', project: 'Orbi City', role: 'Owner' },
  { id: 'A2', code: 'OCT.A.14.1408', project: 'Orbi City', role: 'Owner' },
  { id: 'A3', code: 'OST.A.08.0803', project: 'Orbi Sea Towers', role: 'Trusted' },
]

const COMMUNALS = {
  utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
  // currency 'USD' (the LIVE shape) — owedFor's conditional conversion path
  // is exercised here; the GEL-native mock path is covered by detail.test.jsx
  // (real mock module end-to-end) and payFlowData.test.js.
  maintenance: { owed: 0, advance: 0, currency: 'USD' },
  byApartment: [
    {
      code: 'OCT.A.30.3026',
      epcode: 'EP1',
      electricity: 50, // owed 50
      waterIndication: '-',
      internet: { balance: 10, balanceWithPenalty: 10, cost: 5, penalty: 0 }, // owed 10
      maintenance: 40, // USD, owed 40 -> 80 GEL at rate 2
      displayServices: [],
    },
    {
      code: 'OCT.A.14.1408',
      epcode: 'EP2',
      electricity: -20, // in advance
      waterIndication: '-',
      internet: { balance: 0, balanceWithPenalty: 0, cost: 5, penalty: 0 }, // zero
      maintenance: 0, // zero
      displayServices: [],
    },
    {
      code: 'OST.A.08.0803',
      epcode: 'EP3',
      electricity: 5, // owed 5
      waterIndication: '-',
      internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 },
      maintenance: 0,
      displayServices: [],
    },
  ],
}
const RATES = { rates: [{ pair: 'USD/GEL', rate: 2, delta: 0 }], source: 'NBG' }

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        {/* ApartmentsStep's Pay Now (P3-4) calls useModal() unconditionally,
            so every render of the flow needs a ModalProvider now, not just
            the tests that click Pay Now. */}
        <ModalProvider>
          <AppRoutes />
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  getCommunals.mockReset().mockResolvedValue(COMMUNALS)
  getRates.mockReset().mockResolvedValue(RATES)
  listApartments.mockReset().mockResolvedValue(APARTMENTS)
  payMulti.mockReset().mockResolvedValue({ url: 'https://example.test/pay' })
})

describe('MultiPayFlow — step 1 (complexes)', () => {
  test('renders one card per complex with apartment/unpaid-bill counts and the GEL outstanding total', async () => {
    renderApp(['/pay'])

    expect(await screen.findByRole('heading', { name: 'Pay balances' })).toBeInTheDocument()
    expect(screen.getByText('Orbi City')).toBeInTheDocument()
    expect(screen.getByText('2 apartments')).toBeInTheDocument()
    // row1 owes on all 3 utilities (50 + 10 + 80 GEL), row2 owes nothing
    expect(screen.getByText('3 unpaid bills')).toBeInTheDocument()
    expect(screen.getByText('140.00 ₾')).toBeInTheDocument()

    expect(screen.getByText('Orbi Sea Towers')).toBeInTheDocument()
    expect(screen.getByText('1 apartment')).toBeInTheDocument()
    expect(screen.getByText('1 unpaid bill')).toBeInTheDocument()
    expect(screen.getByText('5.00 ₾')).toBeInTheDocument()
  })
})

describe('MultiPayFlow — step transitions', () => {
  test('complex -> utility -> apartments, and Back returns to the previous step', async () => {
    renderApp(['/pay'])
    await screen.findByText('Orbi City')

    fireEvent.click(screen.getAllByText('Select')[0])
    expect(await screen.findByText('Maintenance')).toBeInTheDocument()
    expect(screen.getByText('Electricity')).toBeInTheDocument()
    expect(screen.getByText('Internet & TV')).toBeInTheDocument()
    // only row1 owes maintenance/electricity/internettv in Orbi City
    expect(screen.getAllByText('1 apartment owes').length).toBe(3)

    fireEvent.click(screen.getByText('Electricity').closest('button'))
    expect(await screen.findByText('OCT.A.30.3026')).toBeInTheDocument()
    expect(screen.getByText('OCT.A.14.1408')).toBeInTheDocument()

    // Back from step 3 returns to the utility cards
    fireEvent.click(screen.getByText('Back'))
    expect(await screen.findByText('Maintenance')).toBeInTheDocument()

    // Back from step 2 returns to the complex list
    fireEvent.click(screen.getByText('Back'))
    expect(await screen.findByText('Orbi Sea Towers')).toBeInTheDocument()
  })
})

describe('MultiPayFlow — step 3 table', () => {
  async function openOrbiCityElectricity() {
    renderApp(['/pay'])
    await screen.findByText('Orbi City')
    fireEvent.click(screen.getAllByText('Select')[0])
    fireEvent.click(await screen.findByText('Electricity').then((el) => el.closest('button')))
    await screen.findByText('OCT.A.30.3026')
  }

  test('rows in advance show the amount with a minus sign and are disabled', async () => {
    await openOrbiCityElectricity()

    const advanceRow = screen.getByText('OCT.A.14.1408').closest('tr')
    expect(within(advanceRow).getByText('-20.00 ₾')).toBeInTheDocument()
    expect(within(advanceRow).getByRole('checkbox')).toBeDisabled()

    const debtRow = screen.getByText('OCT.A.30.3026').closest('tr')
    expect(within(debtRow).getByText('50.00 ₾')).toBeInTheDocument()
    expect(within(debtRow).getByRole('checkbox')).not.toBeDisabled()
  })

  test('checking a row defaults the amount to the owed value, and editing it updates the payable total', async () => {
    await openOrbiCityElectricity()

    const debtRow = screen.getByText('OCT.A.30.3026').closest('tr')
    fireEvent.click(within(debtRow).getByRole('checkbox'))

    // Payable amount defaults to the full owed amount — shown in both the
    // Outstanding column (red) and the summary panel's Payable amount.
    expect(screen.getAllByText('50.00 ₾').length).toBeGreaterThanOrEqual(2)

    const amountInput = within(debtRow).getByRole('textbox')
    fireEvent.change(amountInput, { target: { value: '30' } })

    expect(screen.getByText('30.00 ₾')).toBeInTheDocument()
  })

  test('amount edits above the owed amount are capped at the owed amount', async () => {
    await openOrbiCityElectricity()

    const debtRow = screen.getByText('OCT.A.30.3026').closest('tr')
    fireEvent.click(within(debtRow).getByRole('checkbox'))

    const amountInput = within(debtRow).getByRole('textbox')
    // owed is 50 — an attempted 999 clamps back to 50 (prepayment/overpay
    // support is an open backend question, see ApartmentsStep's FLAG).
    fireEvent.change(amountInput, { target: { value: '999' } })

    expect(amountInput).toHaveValue('50')
    expect(screen.getAllByText('50.00 ₾').length).toBeGreaterThanOrEqual(2)
  })

  // Carried fix from the P3-5 review: switching roleFilter re-derives the
  // visible `rows`, but `selections`/`total` were keyed across the WHOLE
  // complex — so a checked row that the new filter hides used to stay in
  // `selections` (and `total`), while `selectedCount` (derived from the
  // now-filtered `rows`) silently stopped counting it. The footer's "n of m
  // selected · Total X" line went self-contradictory. Needs a complex with
  // mixed roles (the shared APARTMENTS fixture keeps all-Owner and
  // all-Trusted rows in separate complexes), hence the dedicated mocks.
  test('switching the role filter drops now-hidden selections, keeping the footer count/total in sync', async () => {
    listApartments.mockResolvedValue([
      { id: 'C1', code: 'OCM.A.01.0101', project: 'Orbi City', role: 'Owner' },
      { id: 'C2', code: 'OCM.A.02.0202', project: 'Orbi City', role: 'Trusted' },
    ])
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
      maintenance: { owed: 0, advance: 0, currency: 'USD' },
      byApartment: [
        { code: 'OCM.A.01.0101', epcode: 'MEP1', electricity: 50, waterIndication: '-', internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 }, maintenance: 0, displayServices: [] },
        { code: 'OCM.A.02.0202', epcode: 'MEP2', electricity: 30, waterIndication: '-', internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 }, maintenance: 0, displayServices: [] },
      ],
    })

    renderApp(['/pay'])
    await screen.findByText('Orbi City')
    fireEvent.click(screen.getByText('Select'))
    fireEvent.click(await screen.findByText('Electricity').then((el) => el.closest('button')))
    await screen.findByText('OCM.A.01.0101')

    // Check both rows under the default "All" filter.
    for (const code of ['OCM.A.01.0101', 'OCM.A.02.0202']) {
      const row = screen.getByText(code).closest('tr')
      fireEvent.click(within(row).getByRole('checkbox'))
    }
    expect(screen.getByText('2 of 2 selected · Total 80.00 ₾')).toBeInTheDocument()

    // Switch the filter to Owner-only — the Trusted row (and its ₾30
    // selection) drops out of the table...
    fireEvent.click(screen.getByRole('button', { name: 'Owner' }))
    expect(screen.queryByText('OCM.A.02.0202')).not.toBeInTheDocument()

    // ...and the footer must agree: 1 of 1 selected, total only the still
    // visible Owner row's ₾50 — not the stale ₾80 that double-counted the
    // now-hidden Trusted row.
    expect(screen.getByText('1 of 1 selected · Total 50.00 ₾')).toBeInTheDocument()
    expect(screen.getAllByText('50.00 ₾').length).toBeGreaterThanOrEqual(2)
  })

  test("maintenance step 3 converts USD owed via the rate and shows the $1 = X₾ line (currency 'USD')", async () => {
    renderApp(['/pay'])
    await screen.findByText('Orbi City')
    fireEvent.click(screen.getAllByText('Select')[0])
    fireEvent.click(await screen.findByText('Maintenance').then((el) => el.closest('button')))
    await screen.findByText('OCT.A.30.3026')

    // owed 40 USD * rate 2 = 80.00 ₾, and the conversion-rate line renders
    const debtRow = screen.getByText('OCT.A.30.3026').closest('tr')
    expect(within(debtRow).getByText('80.00 ₾')).toBeInTheDocument()
    expect(screen.getByText('$1 = 2.0000₾')).toBeInTheDocument()
  })
})

describe('MultiPayFlow — deep-link preselect', () => {
  test('location.state{apartmentCode,utility} jumps straight to step 3 with that apartment checked', async () => {
    renderApp([{ pathname: '/pay', state: { apartmentCode: 'OST.A.08.0803', utility: 'electricity' } }])

    expect(await screen.findByText('OST.A.08.0803')).toBeInTheDocument()
    // preselected complex/utility surfaced in the summary panel
    expect(screen.getByText('Orbi Sea Towers')).toBeInTheDocument()
    const row = screen.getByText('OST.A.08.0803').closest('tr')
    expect(within(row).getByRole('checkbox')).toBeChecked()
    expect(screen.getAllByText('5.00 ₾').length).toBeGreaterThanOrEqual(2)
  })
})

describe('/pay/:id redirect', () => {
  test('with no router state, redirects into step 1 of the new flow (not the retired PayPage wizard)', async () => {
    renderApp(['/pay/A1'])
    expect(await screen.findByText('Orbi City')).toBeInTheDocument()
    expect(screen.getByText('Pick a complex')).toBeInTheDocument()
  })

  test('forwards apartmentCode/utility router state through into step 3', async () => {
    renderApp([{ pathname: '/pay/A1', state: { apartmentCode: 'OCT.A.30.3026', utility: 'maintenance' } }])

    expect(await screen.findByText('OCT.A.30.3026')).toBeInTheDocument()
    const row = screen.getByText('OCT.A.30.3026').closest('tr')
    expect(within(row).getByRole('checkbox')).toBeChecked()
  })
})

// P3-4: Pay Now opens MethodModal with the selections turned into
// payMulti's services[] shape. payMulti is the mocked module above (default
// resolved {url: 'https://example.test/pay'}, same as the real mock branch);
// window.open is stubbed to observe the redirect-open call without actually
// navigating jsdom anywhere.
describe('Pay Now -> method modal wiring (P3-4)', () => {
  test('selecting an apartment and choosing Bank Card opens the mock payment url', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: {} })
    renderApp([{ pathname: '/pay', state: { apartmentCode: 'OST.A.08.0803', utility: 'electricity' } }])

    await screen.findByText('OST.A.08.0803')
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/ }))

    const modal = await screen.findByTestId('modal-box')
    expect(within(modal).getByText('Orbi Sea Towers • Electricity')).toBeInTheDocument()
    expect(within(modal).getAllByText('5.00 ₾').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(within(modal).getByRole('button', { name: /Bank Card/ }))
    fireEvent.click(within(modal).getByRole('button', { name: 'Continue' }))

    expect(await within(modal).findByText(/Payment opened/)).toBeInTheDocument()
    expect(openSpy).toHaveBeenCalledWith('https://example.test/pay', '_blank')

    openSpy.mockRestore()
  })

  test('a popup-blocked open shows the blocked copy with a working Reopen', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValueOnce(null).mockReturnValue({ opener: {} })
    renderApp([{ pathname: '/pay', state: { apartmentCode: 'OST.A.08.0803', utility: 'electricity' } }])

    await screen.findByText('OST.A.08.0803')
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/ }))
    const modal = await screen.findByTestId('modal-box')

    fireEvent.click(within(modal).getByRole('button', { name: /Bank Card/ }))
    fireEvent.click(within(modal).getByRole('button', { name: 'Continue' }))

    // Heading AND body both switch to the blocked copy (no contradictory
    // "Payment opened" title above a "browser blocked" body).
    expect(await within(modal).findByText('Payment window blocked')).toBeInTheDocument()
    expect(within(modal).getByText(/browser blocked the popup/)).toBeInTheDocument()

    fireEvent.click(within(modal).getByRole('button', { name: /Reopen/ }))
    expect(await within(modal).findByText('Payment opened in a new tab')).toBeInTheDocument()
    expect(within(modal).getByText(/Complete your payment/)).toBeInTheDocument()
    expect(openSpy).toHaveBeenCalledTimes(2)

    openSpy.mockRestore()
  })

  test('payMulti receives exactly the CURRENT selections: checked rows only, with edited amounts', async () => {
    // Dedicated fixture with THREE selectable electricity rows in one
    // complex, so check/edit/uncheck can all happen in a single table.
    listApartments.mockResolvedValue([
      { id: 'B1', code: 'OCB.A.01.0101', project: 'Orbi City', role: 'Owner' },
      { id: 'B2', code: 'OCB.A.02.0202', project: 'Orbi City', role: 'Owner' },
      { id: 'B3', code: 'OCB.A.03.0303', project: 'Orbi City', role: 'Owner' },
    ])
    getCommunals.mockResolvedValue({
      utilities: { electricitySum: 0, internetSum: 0, currency: 'GEL' },
      maintenance: { owed: 0, advance: 0, currency: 'USD' },
      byApartment: [
        { code: 'OCB.A.01.0101', epcode: 'XEP1', electricity: 50, waterIndication: '-', internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 }, maintenance: 0, displayServices: [] },
        { code: 'OCB.A.02.0202', epcode: 'XEP2', electricity: 30, waterIndication: '-', internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 }, maintenance: 0, displayServices: [] },
        { code: 'OCB.A.03.0303', epcode: 'XEP3', electricity: -20, waterIndication: '-', internet: { balance: 0, balanceWithPenalty: 0, cost: 0, penalty: 0 }, maintenance: 0, displayServices: [] },
      ],
    })
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: {} })

    renderApp(['/pay'])
    await screen.findByText('Orbi City')
    fireEvent.click(screen.getByText('Select'))
    fireEvent.click(await screen.findByText('Electricity').then((el) => el.closest('button')))
    await screen.findByText('OCB.A.01.0101')

    // Check all three rows...
    for (const code of ['OCB.A.01.0101', 'OCB.A.02.0202', 'OCB.A.03.0303']) {
      const row = screen.getByText(code).closest('tr')
      fireEvent.click(within(row).getByRole('checkbox'))
    }
    // ...edit row 2's amount down from its owed 30 to a partial 10...
    const row2 = screen.getByText('OCB.A.02.0202').closest('tr')
    fireEvent.change(within(row2).getByRole('textbox'), { target: { value: '10' } })
    // ...and uncheck row 3 again, so it must NOT appear in the POST body.
    const row3 = screen.getByText('OCB.A.03.0303').closest('tr')
    fireEvent.click(within(row3).getByRole('checkbox'))

    fireEvent.click(screen.getByRole('button', { name: /Pay Now/ }))
    const modal = await screen.findByTestId('modal-box')
    // Banner total reflects the same current selections (50 + 10)
    expect(within(modal).getByText('60.00 ₾')).toBeInTheDocument()

    fireEvent.click(within(modal).getByRole('button', { name: /Crypto/ }))
    fireEvent.click(within(modal).getByRole('button', { name: 'Continue' }))
    await within(modal).findByText('Payment opened in a new tab')

    expect(payMulti).toHaveBeenCalledTimes(1)
    expect(payMulti).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'crypto',
        services: [
          { epcode: 'XEP1', amount: 50, serviceType: 'electricity' },
          { epcode: 'XEP2', amount: 10, serviceType: 'electricity' },
        ],
      })
    )

    openSpy.mockRestore()
  })
})

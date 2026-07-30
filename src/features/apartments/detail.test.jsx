import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { AppRoutes } from '../../routes'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <ModalProvider>
          <AppRoutes />
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

test('renders info grid without duplicated block and toggles accordion', async () => {
  renderApp(['/apartments/A1'])
  expect(await screen.findByText('OCT.A.30.3026')).toBeInTheDocument()
  expect(screen.getByText(/Orbi City, Block A · No. 3026/)).toBeInTheDocument()
  const maint = screen.getByRole('button', { name: /Maintenance/ })
  expect(maint).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(maint)
  expect(maint).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Service start date')).toBeInTheDocument()
})

test('internet card shows active plan', async () => {
  renderApp(['/apartments/A1'])
  // plan name appears twice by design: header sub + provider line (ref 1406/1420)
  expect((await screen.findAllByText(/Package 2/)).length).toBeGreaterThanOrEqual(2)
  expect(screen.getByText('Magti · Package 2 (75 Mbps)')).toBeInTheDocument()
  // days left ring + the "40 days left" billing-cycle value
  expect(screen.getByRole('img', { name: '40 days left of 60' })).toBeInTheDocument()
  expect(screen.getByText('40 days left')).toBeInTheDocument()
})

test('unknown apartment id shows not-found state', async () => {
  renderApp(['/apartments/ZZZ'])
  expect(await screen.findByText('Apartment not found')).toBeInTheDocument()
  const backLinks = screen.getAllByRole('link', { name: /All apartments/ })
  for (const link of backLinks) expect(link).toHaveAttribute('href', '/apartments')
})

// Task P3-3: MaintenanceCard/ElectricityCard's Pay links still point at
// `/pay/:id` (kept working via PayRedirect) but now also carry router state
// {apartmentCode, utility} — clicking through PayRedirect into MultiPayFlow
// must land straight on step 3 with A1's row preselected for that utility.
// (Link `state` isn't a DOM attribute, so this drives the actual navigation
// rather than inspecting the anchor.)
//
// This test runs against the REAL mock data modules (no endpoint stubs), so
// it also guards the currency-aware owed math end-to-end: mock maintenance
// balances are GEL-native (mockCommunals currency 'GEL'), and the flow's
// default payment amount must equal the SAME 120.00 ₾ the detail page's Pay
// button shows — the double-conversion regression (₾120 * USD rate = ₾316)
// fails this assertion.
test('Maintenance Pay link lands on step 3 with A1 preselected and the SAME owed amount as the detail page', async () => {
  renderApp(['/apartments/A1'])
  await screen.findByText('OCT.A.30.3026')
  // Anchored regex — a plain /Maintenance/ would be ambiguous once other
  // service cards render (e.g. the accordion header vs. any other button
  // whose text happens to contain the word).
  fireEvent.click(screen.getByRole('button', { name: /^Maintenance Building management/ }))

  // SERVICES.A1.maintenance.balance is -120 (GEL) — the detail page's owed
  const maintPay = await screen.findByRole('link', { name: /Pay 120\.00\s*₾/ })
  expect(maintPay).toHaveAttribute('href', '/pay/A1')
  fireEvent.click(maintPay)

  expect(await screen.findByText('OCT.A.30.3026')).toBeInTheDocument()
  expect(screen.getByText('Orbi City')).toBeInTheDocument()
  expect(screen.getByText('Maintenance')).toBeInTheDocument()
  const row = screen.getByText('OCT.A.30.3026').closest('tr')
  expect(within(row).getByRole('checkbox')).toBeChecked()
  // detail-page owed === flow default amount, verbatim — no rate multiply
  expect(within(row).getByRole('spinbutton')).toHaveValue(120)
  expect(within(row).getByText('120.00 ₾')).toBeInTheDocument()
  // GEL-native maintenance involves no USD conversion -> no "$1 = X₾" line
  expect(screen.queryByText(/\$1 =/)).not.toBeInTheDocument()
})

test('Electricity Pay link lands on step 3 of the multi-pay flow with A1 preselected', async () => {
  renderApp(['/apartments/A1'])
  await screen.findByText('OCT.A.30.3026')
  // Anchored regex — plain /Electricity/ also matches the "Electricity
  // reports" button once the accordion is open.
  fireEvent.click(screen.getByRole('button', { name: /^Electricity Metered consumption/ }))

  const elecPay = await screen.findByRole('link', { name: /Pay 60\.00\s*₾/ })
  expect(elecPay).toHaveAttribute('href', '/pay/A1')
  fireEvent.click(elecPay)

  expect(await screen.findByText('OCT.A.30.3026')).toBeInTheDocument()
  expect(screen.getByText('Electricity')).toBeInTheDocument()
  const row = screen.getByText('OCT.A.30.3026').closest('tr')
  expect(within(row).getByRole('checkbox')).toBeChecked()
})

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

async function openInternetAccordion() {
  fireEvent.click(await screen.findByRole('button', { name: /Internet & TV/ }))
}

test('QR modal opens from the info card and download shows a toast', async () => {
  renderApp(['/apartments/A1'])
  fireEvent.click(await screen.findByRole('button', { name: /Show/ }))
  const modal = await screen.findByTestId('modal-box')
  expect(within(modal).getByText(/Apartment QR —/)).toBeInTheDocument()
  fireEvent.click(within(modal).getByRole('button', { name: /Download QR/ }))
  expect(await screen.findByText('QR downloaded')).toBeInTheDocument()
})

test('electricity report modal: generate monthly report then download', async () => {
  renderApp(['/apartments/A1'])
  fireEvent.click(await screen.findByRole('button', { name: /Metered consumption/ }))
  fireEvent.click(screen.getByRole('button', { name: /Electricity reports/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Monthly report/ }))
  expect(await screen.findByText(/Monthly report generated/, {}, { timeout: 3000 })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }))
  expect(await screen.findByText('Monthly report downloaded')).toBeInTheDocument()
}, 8000)

test('doors calendar renders June 2026 with counts', async () => {
  renderApp(['/apartments/A1'])
  fireEvent.click(await screen.findByText('Open calendar'))
  expect(await screen.findByText('June 2026')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Next month/ }))
  expect(await screen.findByText('July 2026')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Year' }))
  expect(await screen.findByText(/Total 2026/)).toBeInTheDocument()
})

test('change package: select P3, confirm, calls endpoint and closes', async () => {
  renderApp(['/apartments/A1'])
  await openInternetAccordion()
  fireEvent.click(screen.getByText('Change package'))
  const p3Card = await screen.findByTestId('plan-card-P3')
  fireEvent.click(within(p3Card).getByRole('button', { name: 'Change' }))
  fireEvent.click(screen.getByText('Confirm'))
  expect(await screen.findByText(/Package changed to Package 3/)).toBeInTheDocument()
  expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()
})

test('change package modal on a no-plan apartment shows grid with no current-plan highlight', async () => {
  renderApp(['/apartments/A4'])
  await openInternetAccordion()
  fireEvent.click(screen.getByText('Choose a package'))
  expect(await screen.findByTestId('plan-card-P1')).toBeInTheDocument()
  expect(screen.queryByText('Current plan')).not.toBeInTheDocument()
})

test('boost: select, confirm, activates and shows toast', async () => {
  renderApp(['/apartments/A1'])
  await openInternetAccordion()
  fireEvent.click(screen.getByRole('button', { name: /^Boost$/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Boost 65/ }))
  fireEvent.click(screen.getByRole('button', { name: /Activate/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Charge & activate/ }))
  expect(await screen.findByText(/Boost 65 activated/)).toBeInTheDocument()
})

test('pause via modal then resume via InternetCard button (roundtrip)', async () => {
  renderApp(['/apartments/A1'])
  await openInternetAccordion()
  fireEvent.click(screen.getByRole('button', { name: /^Pause$/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Pause service/ }))
  expect(await screen.findByText(/Internet & TV paused/)).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: /Resume service/ }))
  expect(await screen.findByText('Internet & TV resumed')).toBeInTheDocument()
})

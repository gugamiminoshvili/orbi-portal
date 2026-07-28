import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { setLang } from '../../i18n'
import { AppRoutes } from '../../routes'
import Breadcrumbs from './Breadcrumbs'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  )
}

afterEach(() => {
  setLang('en')
})

test('sidebar shows nav and disabled items do not navigate', () => {
  renderApp(['/news'])
  expect(screen.getByText('My Apartments')).toBeInTheDocument()
  // Your Devices is a genuinely disabled/coming-soon item. (Invoices and
  // Bookings and Visits were removed at owner request 2026-07-21 until their
  // forms are ready — see Sidebar.jsx.)
  const devices = screen.getByText('Your Devices')
  expect(devices.closest('[aria-disabled="true"]')).toBeTruthy()
})

test('the temporarily-removed nav items are not rendered', () => {
  renderApp(['/news'])
  // Removed at owner request (2026-07-21) — restore when their pages exist.
  expect(screen.queryByText('Bookings and Visits')).not.toBeInTheDocument()
  expect(screen.queryByText('Invoices')).not.toBeInTheDocument()
  expect(screen.queryByText('Payments')).not.toBeInTheDocument()
  expect(screen.queryByText('Reports')).not.toBeInTheDocument()
})

test('language menu shows the current flag and switches the UI language', async () => {
  renderApp(['/news'])
  // The inline EN/ქარ/РУС pill was replaced by a flag dropdown (owner request).
  fireEvent.click(screen.getByLabelText('Language'))
  fireEvent.click(await screen.findByRole('menuitem', { name: /ქართული/ }))
  expect(await screen.findByText('ჩემი აპარტამენტები')).toBeInTheDocument()
})

test('the sidebar no longer carries an identity footer (it lives in the header menu)', () => {
  renderApp(['/news'])
  expect(screen.queryByText('Owner · 5 units')).not.toBeInTheDocument()
  // The signed-in user is shown once, by the header account menu.
  expect(screen.getByRole('button', { expanded: false, name: /Guga/ })).toBeInTheDocument()
})

test('root redirects to /dashboard and unknown paths redirect to /dashboard', () => {
  renderApp(['/'])
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
})

test('unknown paths redirect to /dashboard', () => {
  renderApp(['/some/unknown/path'])
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
})

test('breadcrumbs render a separator and bold the last (current) item', () => {
  render(
    <MemoryRouter>
      <Breadcrumbs items={[{ label: 'Home', to: '/news' }, { label: 'Support' }]} />
    </MemoryRouter>
  )
  expect(screen.getByText('›')).toBeInTheDocument()
  expect(screen.getByText('Support').tagName).toBe('B')
  expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/news')
})

test('burger button toggles the mobile sidebar open state', () => {
  renderApp(['/news'])
  const burger = screen.getByLabelText('Open menu')
  const sidebar = screen.getByLabelText('Main navigation')
  expect(sidebar.className).not.toMatch(/open/)
  fireEvent.click(burger)
  expect(sidebar.className).toMatch(/open/)
})

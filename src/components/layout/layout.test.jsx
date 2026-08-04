import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { setLang } from '../../i18n'
import { AppRoutes } from '../../routes'
import { ThemeProvider } from '../../context/ThemeContext'
import Breadcrumbs from './Breadcrumbs'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </MemoryRouter>
  )
}

afterEach(() => {
  setLang('en')
  localStorage.removeItem('orbi-theme')
  document.documentElement.removeAttribute('data-theme')
})

// The account menu is the only way into language and dark mode now, so most
// tests below start by opening it.
function openAccountMenu() {
  fireEvent.click(screen.getByRole('button', { expanded: false, name: /Guga/ }))
}

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

test('the account menu switches the UI language', async () => {
  renderApp(['/news'])
  // Language lost its own header control (owner request 2026-08-04) and is
  // now a row in the account menu that opens a list.
  openAccountMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: /Language/ }))
  fireEvent.click(await screen.findByRole('menuitemradio', { name: /ქართული/ }))
  expect(await screen.findByText('ჩემი აპარტამენტები')).toBeInTheDocument()
})

test('the header carries no separate language control', () => {
  renderApp(['/news'])
  expect(screen.queryByRole('button', { name: 'Language' })).not.toBeInTheDocument()
})

test('the language row shows the active language and marks it in the list', async () => {
  renderApp(['/news'])
  openAccountMenu()
  expect(screen.getByRole('menuitem', { name: /Language/ })).toHaveTextContent('English')
  fireEvent.click(screen.getByRole('menuitem', { name: /Language/ }))
  expect(await screen.findByRole('menuitemradio', { name: /English/ })).toBeChecked()
  expect(screen.getByRole('menuitemradio', { name: /Русский/ })).not.toBeChecked()
})

test('the language list can be backed out of without changing anything', async () => {
  renderApp(['/news'])
  openAccountMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: /Language/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Back' }))
  // Back on the root pane, still in English.
  expect(screen.getByRole('menuitem', { name: /My profile/ })).toBeInTheDocument()
  expect(screen.getByText('My Apartments')).toBeInTheDocument()
})

test('the account menu toggles dark mode and persists it', () => {
  renderApp(['/news'])
  openAccountMenu()
  const toggle = screen.getByRole('menuitemcheckbox', { name: /Dark mode/ })
  expect(toggle).not.toBeChecked()

  fireEvent.click(toggle)
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('orbi-theme')).toBe('dark')

  // The menu stays open across a toggle, so the same row flips it back.
  expect(toggle).toBeChecked()
  fireEvent.click(toggle)
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('a saved dark theme is applied on load', () => {
  localStorage.setItem('orbi-theme', 'dark')
  renderApp(['/news'])
  expect(document.documentElement.dataset.theme).toBe('dark')
  openAccountMenu()
  expect(screen.getByRole('menuitemcheckbox', { name: /Dark mode/ })).toBeChecked()
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

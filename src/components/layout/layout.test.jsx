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
  // Dashboard became a real nav item in Phase 3 (P3-2) — Invoices is still
  // one of the genuinely disabled/coming-soon items.
  const invoices = screen.getByText('Invoices')
  expect(invoices.closest('[aria-disabled="true"]')).toBeTruthy()
})

test('lang switch changes sidebar language', async () => {
  renderApp(['/news'])
  screen.getByText('ქარ').click()
  expect(await screen.findByText('ჩემი აპარტამენტები')).toBeInTheDocument()
})

test('sidebar footer shows fixed 5 units, not the prototype 3-unit bug', () => {
  renderApp(['/news'])
  expect(screen.getByText('Guga M.')).toBeInTheDocument()
  expect(screen.getByText('Owner · 5 units')).toBeInTheDocument()
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

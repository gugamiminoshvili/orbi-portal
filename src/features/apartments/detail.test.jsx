import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
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
  expect(await screen.findByText(/Package 2/)).toBeInTheDocument()
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

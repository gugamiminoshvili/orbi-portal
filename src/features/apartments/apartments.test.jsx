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

test('groups apartments by project and filters by role', async () => {
  renderApp(['/apartments'])
  expect(await screen.findByText('Orbi City')).toBeInTheDocument()
  expect(screen.getByText('3 units')).toBeInTheDocument()
  expect(screen.getByText('2 units')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Trusted' }))
  expect(screen.queryByText('OCT.A.30.3026')).not.toBeInTheDocument()
  expect(screen.getByText('OST.A.08.0803')).toBeInTheDocument()
})

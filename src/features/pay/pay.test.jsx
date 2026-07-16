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

test('full pay flow reaches success and clears balance', async () => {
  renderApp(['/pay/A3'])
  expect(await screen.findByText(/₾95\.00/)).toBeInTheDocument()
  fireEvent.click(screen.getByText('Continue'))
  fireEvent.click(await screen.findByText(/Bank transfer/))
  fireEvent.click(screen.getByText('Continue'))
  fireEvent.click(await screen.findByRole('button', { name: /Pay/ }))
  expect(await screen.findByText(/Payment successful/)).toBeInTheDocument()
})

test('rejects zero amount', async () => {
  renderApp(['/pay/A3'])
  const input = await screen.findByLabelText(/Amount to pay/)
  fireEvent.change(input, { target: { value: '0' } })
  fireEvent.click(screen.getByText('Continue'))
  expect(await screen.findByText(/Enter a valid amount/)).toBeInTheDocument()
})

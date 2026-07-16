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

test('filters tickets by status tab', async () => {
  renderApp(['/support'])
  expect(await screen.findByText(/Technical Problem/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Resolved' }))
  expect(screen.queryByText(/Technical Problem/)).not.toBeInTheDocument()
})

test('create ticket flow', async () => {
  renderApp(['/support/new'])
  fireEvent.click(await screen.findByText('Other Request'))
  fireEvent.change(screen.getByPlaceholderText(/Describe your issue/), { target: { value: 'Help' } })
  fireEvent.click(screen.getByRole('button', { name: /Submit/ }))
  expect(await screen.findByText('Help')).toBeInTheDocument() // lands in chat
})

test('send message appends bubble', async () => {
  renderApp(['/support/t/101245'])
  const input = await screen.findByPlaceholderText(/Write a message/)
  fireEvent.change(input, { target: { value: 'any update?' } })
  fireEvent.click(screen.getByRole('button', { name: /Send/ }))
  expect(await screen.findByText('any update?')).toBeInTheDocument()
})

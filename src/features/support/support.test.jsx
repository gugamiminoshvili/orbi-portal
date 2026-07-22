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

test('filters tickets by status tab', async () => {
  renderApp(['/support'])
  expect(await screen.findByText(/Technical Problem/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Resolved' }))
  expect(screen.queryByText(/Technical Problem/)).not.toBeInTheDocument()
})

test('create ticket flow', async () => {
  renderApp(['/support/new'])
  // Topic now lives behind a picker modal opened from the "Select topic" row.
  fireEvent.click(await screen.findByText('Select topic'))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByText('Other Request'))
  fireEvent.change(screen.getByPlaceholderText(/Describe your issue/), { target: { value: 'Help' } })
  fireEvent.click(screen.getByRole('button', { name: /Submit/ }))
  expect(await screen.findByText('Help')).toBeInTheDocument() // lands in chat
})

test('apartment multi-select adds removable chips', async () => {
  renderApp(['/support/new'])
  fireEvent.click(await screen.findByText(/General — not apartment-specific/))
  // Pick two apartments from the dropdown (option buttons, distinct from the
  // ticket-list previews that also mention apartment codes).
  fireEvent.click(await screen.findByRole('button', { name: 'OCT.A.30.3026' }))
  fireEvent.click(screen.getByRole('button', { name: 'OCT.B.21.2105' }))
  expect(screen.getByText('2 apartments selected')).toBeInTheDocument()
})

test('send message appends bubble', async () => {
  renderApp(['/support/t/101245'])
  const input = await screen.findByPlaceholderText(/Write a message/)
  fireEvent.change(input, { target: { value: 'any update?' } })
  fireEvent.click(screen.getByRole('button', { name: /Send/ }))
  expect(await screen.findByText('any update?')).toBeInTheDocument()
})

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
  // Empty state shows the placeholder; clicking it opens the dropdown.
  fireEvent.click(await screen.findByText('Please select apartment'))
  // Pick two apartments from the dropdown (option buttons, distinct from the
  // ticket-list previews that also mention apartment codes).
  fireEvent.click(await screen.findByRole('button', { name: 'OCT.A.30.3026' }))
  fireEvent.click(screen.getByRole('button', { name: 'OCT.B.21.2105' }))
  // Two removable chips now render inside the control.
  expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2)
})

test('send message appends bubble', async () => {
  renderApp(['/support/t/101245'])
  const input = await screen.findByPlaceholderText(/Write a message/)
  fireEvent.change(input, { target: { value: 'any update?' } })
  fireEvent.click(screen.getByRole('button', { name: /Send/ }))
  expect(await screen.findByText('any update?')).toBeInTheDocument()
})

// ---------- Attachments ----------
// POST /tickets/file/ takes a ticketId, so the new-ticket form can only hold
// files until createTicket() returns one. The mock endpoint appends them to
// the ticket's last message, which is what makes them visible in the thread.

function pickFiles(input, files) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

function fakeFile(name, type, size = 100) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

test('files picked on the new-ticket form show as removable chips', async () => {
  const { container } = renderApp(['/support/new'])
  await screen.findByText('Select topic')
  const input = container.querySelector('input[type="file"]')

  pickFiles(input, [fakeFile('lease.pdf', 'application/pdf', 2048)])

  expect(await screen.findByText('lease.pdf')).toBeInTheDocument()
  expect(screen.getByText('2 KB')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Remove lease.pdf' }))
  expect(screen.queryByText('lease.pdf')).not.toBeInTheDocument()
})

test('a rejected file is reported and never queued', async () => {
  const { container } = renderApp(['/support/new'])
  await screen.findByText('Select topic')
  const input = container.querySelector('input[type="file"]')

  // One allowed file alongside one that isn't: the good one still queues.
  pickFiles(input, [fakeFile('notes.txt', 'text/plain'), fakeFile('ok.png', 'image/png')])

  expect(
    await screen.findByText(/notes.txt is not a supported file type/)
  ).toBeInTheDocument()
  expect(screen.getByText('ok.png')).toBeInTheDocument()
  expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()
})

test('submitting uploads the queued files and they appear in the thread', async () => {
  const { container } = renderApp(['/support/new'])
  fireEvent.click(await screen.findByText('Select topic'))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByText('Other Request'))
  fireEvent.change(screen.getByPlaceholderText(/Describe your issue/), { target: { value: 'See attached' } })
  pickFiles(container.querySelector('input[type="file"]'), [fakeFile('lease.pdf', 'application/pdf')])

  fireEvent.click(screen.getByRole('button', { name: /Submit/ }))

  // Landed in the chat, with the file rendered on the message.
  expect(await screen.findByText('See attached')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: /lease\.pdf/ })).toBeInTheDocument()
})

test('attaching from the chat composer adds the file to the thread', async () => {
  const { container } = renderApp(['/support/t/101245'])
  await screen.findByPlaceholderText(/Write a message/)

  pickFiles(container.querySelector('input[type="file"]'), [fakeFile('meter.png', 'image/png')])

  expect(await screen.findByRole('button', { name: /meter\.png/ })).toBeInTheDocument()
})

test('a stored file with no bytes behind it says so instead of downloading', async () => {
  const { container } = renderApp(['/support/t/101245'])
  await screen.findByPlaceholderText(/Write a message/)
  pickFiles(container.querySelector('input[type="file"]'), [fakeFile('receipt.png', 'image/png')])

  fireEvent.click(await screen.findByRole('button', { name: /receipt\.png/ }))

  // Mock mode holds the file's metadata but not its content.
  expect(await screen.findByText('This demo has no file to download.')).toBeInTheDocument()
})

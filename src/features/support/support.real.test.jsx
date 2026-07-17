// Real-mode failure-handling test for TicketChatPane.handleSend: with
// USE_MOCK forced false (same vi.mock pattern as modals.real.test.jsx and
// pay.real.test.jsx), a rejected sendMessage() must not clear the composer,
// must restore the sending state (so Send is usable again), and must surface
// a toast — instead of leaving an unhandled rejection and a stuck spinner.
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn(), httpMultipart: vi.fn() }
})

vi.mock('../../api/endpoints/support', () => ({
  listTickets: vi.fn(),
  getTicket: vi.fn(),
  sendMessage: vi.fn(),
  uploadTicketFile: vi.fn(),
}))

import { listTickets, getTicket, sendMessage } from '../../api/endpoints/support'

const TICKET = {
  id: 101245,
  topic: 'technical',
  apt: null,
  status: 'active',
  created: '2026-07-10 07:51',
  preview: 'existing message',
  msgs: [{ me: true, date: '10.07.2026', time: '07:51', text: 'existing message' }],
}

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  listTickets.mockReset().mockResolvedValue([TICKET])
  getTicket.mockReset().mockResolvedValue(TICKET)
  sendMessage.mockReset()
})

describe('TicketChatPane (real mode)', () => {
  test('a rejected send shows a toast, restores the Send button, and keeps the draft', async () => {
    sendMessage.mockRejectedValueOnce(new Error('network down'))

    renderApp(['/support/t/101245'])

    const input = await screen.findByPlaceholderText(/Write a message/)
    fireEvent.change(input, { target: { value: 'still typing this' } })
    const sendBtn = screen.getByRole('button', { name: /Send/ })
    fireEvent.click(sendBtn)

    expect(await screen.findByText(/request failed/i)).toBeInTheDocument()
    // draft preserved (not cleared on failure)
    expect(input).toHaveValue('still typing this')
    // sending state reset — button usable again for a retry
    expect(sendBtn).not.toBeDisabled()
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })
})

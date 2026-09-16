import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { NotificationsProvider } from '../../context/NotificationsContext'
import { AppRoutes } from '../../routes'
import { adaptNotifications, unreadCount } from '../../api/adapters/notifications'
import { routeFor, relativeTime } from './notificationMeta'

vi.mock('../../api/endpoints/notifications', () => ({
  listNotifications: vi.fn(),
  markAllSeen: vi.fn(),
  openNotification: vi.fn(),
}))

import { listNotifications, markAllSeen, openNotification } from '../../api/endpoints/notifications'

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

const ROWS = [
  { id: 1, at: hoursAgo(2), ts: Date.now() - 2 * 3600e3, msg: 'Your ticket has a new reply', note: 'Maintenance answered.', type: 'ticket_reply', seen: false, ticketId: 4821, reservationId: null, flat: null },
  { id: 2, at: hoursAgo(5), ts: Date.now() - 5 * 3600e3, msg: 'Payment received', note: '', type: 'payment', seen: false, ticketId: null, reservationId: null, flat: { id: 'A1', name: 'OCT.A.30.3026' } },
  { id: 3, at: hoursAgo(80), ts: Date.now() - 80 * 3600e3, msg: 'Lift maintenance on Block A', note: '', type: 'announcement', seen: true, ticketId: null, reservationId: null, flat: null },
]

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ModalProvider>
          <NotificationsProvider>
            <AppRoutes />
          </NotificationsProvider>
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  listNotifications.mockReset().mockResolvedValue(ROWS)
  markAllSeen.mockReset().mockResolvedValue({ ok: true })
  openNotification.mockReset().mockResolvedValue({ ok: true })
})
afterEach(() => vi.useRealTimers())

describe('adaptNotifications', () => {
  // The payload nests the flat inside each row and repeats the customer id;
  // neither has a use in the list.
  test('flattens the row and reads its three possible destinations', () => {
    const [n] = adaptNotifications([
      {
        id: 7, datetime: '2026-09-14 08:30:00', msg: ' Payment received ', note: 'Credited.',
        seen: false, seen_at: null, type: 'payment', reservation: null,
        flat: { id: 12, floor: '30', flat: '3026', apartmentName: 'OCT.A.30.3026' },
        ticket: null, customer: 23818,
      },
    ])
    expect(n).toMatchObject({
      id: 7, msg: 'Payment received', note: 'Credited.', type: 'payment', seen: false,
      ticketId: null, reservationId: null, flat: { id: 12, name: 'OCT.A.30.3026' },
    })
    // Zone-less timestamps are read as UTC, so ordering cannot shift with
    // the machine's timezone.
    expect(n.at).toBe('2026-09-14T08:30:00.000Z')
  })

  test('newest first, and a row with no id is dropped rather than rendered blank', () => {
    const list = adaptNotifications([
      { id: 1, datetime: '2026-09-10 10:00:00', msg: 'older' },
      { datetime: '2026-09-15 10:00:00', msg: 'no id' },
      { id: 2, datetime: '2026-09-15 10:00:00', msg: 'newer' },
    ])
    expect(list.map((n) => n.msg)).toEqual(['newer', 'older'])
  })

  test('unreadCount counts only the unseen', () => {
    expect(unreadCount(ROWS)).toBe(2)
    expect(unreadCount([])).toBe(0)
  })
})

describe('routeFor', () => {
  // A reply belongs to its thread, not to the apartment the thread is about.
  test('prefers the ticket, then the booking, then the apartment', () => {
    expect(routeFor({ ticketId: 9, reservationId: 4, flat: { id: 'A1' } })).toBe('/support/t/9')
    expect(routeFor({ ticketId: null, reservationId: 4, flat: { id: 'A1' } })).toBe('/bookings')
    expect(routeFor({ ticketId: null, reservationId: null, flat: { id: 'A1' } })).toBe('/apartments/A1')
  })

  test('a row that names no destination is not a link', () => {
    expect(routeFor({ ticketId: null, reservationId: null, flat: null })).toBe(null)
  })
})

describe('relativeTime', () => {
  test('recent rows read as an interval, old ones as a date', () => {
    expect(relativeTime(hoursAgo(3), 'en')).toMatch(/3 hours ago/)
    expect(relativeTime(new Date('2026-01-04T10:00:00Z').toISOString(), 'en')).toMatch(/2026/)
    expect(relativeTime(null)).toBe('')
  })
})

describe('the header bell', () => {
  test('carries the unread marker, and drops it once everything is read', async () => {
    renderAt('/dashboard')
    const bell = await screen.findByRole('button', { name: /notification/i })
    await waitFor(() => expect(bell.querySelector('[data-unread]')).toHaveAttribute('data-unread', '2'))

    fireEvent.click(bell)
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }))

    await waitFor(() => expect(markAllSeen).toHaveBeenCalled())
    expect(bell.querySelector('[data-unread]')).toBeNull()
  })

  // The owner's call: opening the panel is not reading.
  test('opening the panel marks nothing read', async () => {
    renderAt('/dashboard')
    const bell = await screen.findByRole('button', { name: /notification/i })
    await waitFor(() => expect(bell.querySelector('[data-unread]')).not.toBeNull())

    fireEvent.click(bell)
    await screen.findByText('Payment received')

    expect(markAllSeen).not.toHaveBeenCalled()
    expect(openNotification).not.toHaveBeenCalled()
    expect(bell.querySelector('[data-unread]')).toHaveAttribute('data-unread', '2')
  })

  test('a row with a ticket opens that thread and marks itself read', async () => {
    renderAt('/dashboard')
    fireEvent.click(await screen.findByRole('button', { name: /notification/i }))

    const row = await screen.findByText('Your ticket has a new reply')
    expect(row.closest('a')).toHaveAttribute('href', '/support/t/4821')
    fireEvent.click(row)

    await waitFor(() => expect(openNotification).toHaveBeenCalledWith(1))
  })

  test('the panel closes on Escape', async () => {
    renderAt('/dashboard')
    fireEvent.click(await screen.findByRole('button', { name: /notification/i }))
    await screen.findByText('Payment received')

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Payment received')).not.toBeInTheDocument())
  })

  test('an account with nothing to report gets an explanation, not a blank panel', async () => {
    listNotifications.mockResolvedValue([])
    renderAt('/dashboard')
    fireEvent.click(await screen.findByRole('button', { name: /notification/i }))

    expect(await screen.findByText('No notifications')).toBeInTheDocument()
  })
})

describe('the notifications page', () => {
  const page = () => document.querySelector('[role="tablist"]').parentElement

  test('groups by age and marks the unread ones', async () => {
    renderAt('/notifications')
    expect(await screen.findByText('Lift maintenance on Block A')).toBeInTheDocument()

    // 2 and 5 hours old land in Today; 80 hours is still inside the week.
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(within(page()).getAllByLabelText('Unread')).toHaveLength(2)
  })

  test('the unread tab hides what has already been read', async () => {
    renderAt('/notifications')
    await screen.findByText('Lift maintenance on Block A')

    fireEvent.click(screen.getByRole('tab', { name: /unread \(2\)/i }))

    expect(screen.queryByText('Lift maintenance on Block A')).not.toBeInTheDocument()
    expect(screen.getByText('Payment received')).toBeInTheDocument()
  })

  test('reading everything leaves the unread tab with a message, not an empty page', async () => {
    renderAt('/notifications')
    await screen.findByText('Payment received')

    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }))
    fireEvent.click(screen.getByRole('tab', { name: /unread/i }))

    expect(await screen.findByText('All caught up')).toBeInTheDocument()
  })

  test('a row without a destination is still readable, and is not a link', async () => {
    renderAt('/notifications')
    const row = await screen.findByText('Lift maintenance on Block A')
    expect(row.closest('a')).toBeNull()

    fireEvent.click(row)
    // Already seen, so nothing is sent: a read row re-read is not an event.
    expect(openNotification).not.toHaveBeenCalled()
  })
})

describe('polling', () => {
  test('refetches once a minute while the tab is in front', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderAt('/dashboard')
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(60_000)
    expect(listNotifications).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(listNotifications).toHaveBeenCalledTimes(3)
  })
})

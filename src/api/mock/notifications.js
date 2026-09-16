// Mock notifications, shaped exactly as the live DTO arrives (not as the
// adapter returns it) so the adapter is exercised in mock mode too.
//
// The spread is deliberate: one row per destination the payload can name —
// a ticket reply, a booking, an apartment — plus a plain announcement with
// no destination at all, and two already-seen rows so the unread count is
// never trivially "all of them".
function ago(hours) {
  const d = new Date(Date.now() - hours * 3600 * 1000)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export const MOCK_NOTIFICATIONS = [
  {
    id: 5012,
    datetime: ago(1),
    msg: 'Your ticket has a new reply',
    note: 'Maintenance answered your request about the bathroom leak.',
    seen: false,
    seen_at: null,
    type: 'ticket_reply',
    reservation: null,
    flat: null,
    ticket: 4821,
    customer: 23818,
  },
  {
    id: 5011,
    datetime: ago(6),
    msg: 'Payment received',
    note: '1,204.16 ₾ was credited to OCT.A.30.3026.',
    seen: false,
    seen_at: null,
    type: 'payment',
    reservation: null,
    flat: { id: 'A1', floor: '30', flat: '3026', apartmentName: 'OCT.A.30.3026' },
    ticket: null,
    customer: 23818,
  },
  {
    id: 5010,
    datetime: ago(27),
    msg: 'Your booking is confirmed',
    note: 'Pool, Saturday 18:00-19:00.',
    seen: false,
    seen_at: null,
    type: 'reservation',
    reservation: 771,
    flat: null,
    ticket: null,
    customer: 23818,
  },
  {
    id: 5009,
    datetime: ago(52),
    msg: 'Water meter reading is due',
    note: 'Submit the reading for OCT.A.14.1408 before the 25th.',
    seen: true,
    seen_at: ago(50),
    type: 'utility',
    reservation: null,
    flat: { id: 'A2', floor: '14', flat: '1408', apartmentName: 'OCT.A.14.1408' },
    ticket: null,
    customer: 23818,
  },
  {
    id: 5008,
    datetime: ago(120),
    msg: 'Lift maintenance on Block A',
    note: 'Block A lifts are out of service on Tuesday, 09:00-13:00.',
    seen: true,
    seen_at: ago(118),
    type: 'announcement',
    reservation: null,
    flat: null,
    ticket: null,
    customer: 23818,
  },
]

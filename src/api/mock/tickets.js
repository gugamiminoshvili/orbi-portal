// Support tickets mock data — lifted verbatim from reference/orbi-portal-redesign.html (lines 1774-1807)
// Topic `icon` fields are icon NAME strings; the Icon component (Task 7) maps names to SVGs.
export const SUPPORT_TOPICS = [
  { id: 'payment', label: 'Payment & Billing Issues', desc: 'Problems with payments, charges or your account', icon: 'wallet', tintBg: 'var(--pos-bg)', tintCol: 'var(--pos-ink)' },
  { id: 'technical', label: 'Technical Problem', desc: "Technical issues or something isn't working", icon: 'wrench', tintBg: 'var(--info-bg)', tintCol: 'var(--info-ink)' },
  { id: 'booking', label: 'Booking Questions', desc: 'Questions about your booking or reservation', icon: 'cal', tintBg: '#ece7ff', tintCol: '#6b4bff' },
  { id: 'access', label: 'Access Card Request', desc: 'Request a new access card (Digital Key)', icon: 'card', tintBg: 'var(--warn-bg)', tintCol: 'var(--warn-ink)' },
  { id: 'internet', label: 'Internet & TV Issue', desc: 'Problems with internet or TV services', icon: 'wifi', tintBg: 'var(--teal-soft)', tintCol: 'var(--teal-ink)' },
  { id: 'other', label: 'Other Request', desc: 'Other issues or requests', icon: 'dots', tintBg: '#eef0f6', tintCol: 'var(--muted)' },
]

export const topicById = (id) => SUPPORT_TOPICS.find((t) => t.id === id)

export const TSTATUS = {
  active: { cls: 'pos', label: 'Active' },
  resolved: { cls: 'info', label: 'Resolved' },
  closed: { cls: 'muted', label: 'Closed' },
}

export const SUP_FILTERS = ['all', 'active', 'resolved', 'closed']
export const SUP_FILTER_LABEL = { all: 'All', active: 'Active', resolved: 'Resolved', closed: 'Closed' }

// `apts` is the (possibly empty) list of apartments a ticket is associated
// with — {id, code} is all the ticket UI needs to display. Matches the shape
// createTicket now stores (selected apartment objects) and adaptTicket emits.
export const TICKETS = [
  { id: 101245, topic: 'technical', apts: [], status: 'active', created: '2026-07-10 07:51', preview: 'Test 123 — the app keeps logging me out on the dashboard.',
    msgs: [{ me: true, date: '10.07.2026', time: '07:51', text: 'Test 123 — the app keeps logging me out on the dashboard.' }] },
  { id: 101244, topic: 'internet', apts: [{ id: 'A1', code: 'OCT.A.30.3026' }], status: 'active', created: '2026-07-09 14:20', preview: 'Internet in OCT.A.30.3026 is very slow since yesterday evening.',
    msgs: [{ me: true, date: '09.07.2026', time: '14:20', text: 'The internet in my apartment (OCT.A.30.3026) has been very slow since yesterday evening.' },
      { me: false, who: 'ORBI Support', date: '09.07.2026', time: '14:35', text: 'Hello Nadiia, thank you for reaching out. We have logged the issue with the ISP and will update you within 24 hours.' }] },
  { id: 101243, topic: 'payment', apts: [{ id: 'A3', code: 'OCT.B.21.2105' }], status: 'resolved', created: '2026-07-07 09:20', preview: 'Double charge on my July management fee for OCT.B.21.2105.',
    msgs: [{ me: true, date: '07.07.2026', time: '09:20', text: 'I was charged twice for the July management fee on OCT.B.21.2105.' },
      { me: false, who: 'ORBI Support', date: '07.07.2026', time: '11:02', text: 'We confirmed the duplicate charge and issued a refund of ₾95.00. It should appear within 3–5 business days.' },
      { me: true, date: '07.07.2026', time: '11:20', text: 'Received, thank you!' }] },
  { id: 101232, topic: 'access', apts: [{ id: 'A2', code: 'OCT.A.14.1408' }], status: 'active', created: '2026-07-07 09:18', preview: 'Requesting a new digital key for OCT.A.14.1408 — lost my phone.',
    msgs: [{ me: true, date: '07.07.2026', time: '09:18', text: 'I lost my phone and need a new digital key issued for OCT.A.14.1408.' }] },
  { id: 101210, topic: 'booking', apts: [], status: 'closed', created: '2026-06-28 16:05', preview: 'How do I extend a guest booking past the current month?',
    msgs: [{ me: true, date: '28.06.2026', time: '16:05', text: 'How do I extend a guest booking past the current month?' },
      { me: false, who: 'ORBI Support', date: '28.06.2026', time: '16:40', text: 'You can extend from Bookings and Visits → open the booking → Extend. Let us know if you need a hand.' }] },
  { id: 101198, topic: 'other', apts: [], status: 'closed', created: '2026-06-20 10:30', preview: 'Can I get a copy of the 2025 annual reconciliation statement?',
    msgs: [{ me: true, date: '20.06.2026', time: '10:30', text: 'Can I get a copy of the 2025 annual reconciliation statement?' },
      { me: false, who: 'ORBI Support', date: '20.06.2026', time: '12:15', text: 'Sure — it is attached here and also available under Reports for each unit.' }] },
]

// `TICKET_SEQ` in the prototype was a mutable module-level counter; here it's encapsulated
// behind nextTicketId() so callers can't accidentally read/write it out of band.
let ticketSeq = 101245
export function nextTicketId() {
  ticketSeq += 1
  return ticketSeq
}

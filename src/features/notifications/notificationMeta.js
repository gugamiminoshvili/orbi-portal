// Presentation rules shared by the bell panel and the notifications page, so
// a row cannot look like one thing in the panel and another on the page.

// `type` is a free string set by the backend and its full set is not
// documented (README question, 2026-09-16). This map is therefore a set of
// known values, not an enum: anything unlisted gets the neutral bell rather
// than being dropped or mislabelled.
const BY_TYPE = {
  ticket_reply: { icon: 'chat', tone: 'info' },
  ticket: { icon: 'chat', tone: 'info' },
  payment: { icon: 'card', tone: 'pos' },
  invoice: { icon: 'card', tone: 'pos' },
  reservation: { icon: 'cal', tone: 'info' },
  booking: { icon: 'cal', tone: 'info' },
  utility: { icon: 'bolt', tone: 'warn' },
  debt: { icon: 'wallet', tone: 'neg' },
  announcement: { icon: 'doc', tone: 'neutral' },
  news: { icon: 'doc', tone: 'neutral' },
}

export function metaFor(n) {
  return BY_TYPE[n?.type] || { icon: 'bell', tone: 'neutral' }
}

// Where a row leads. The payload can name three destinations at once, so the
// order is the specific before the general: a reply belongs to its thread,
// not to the apartment the thread is about. A row that names nothing stays
// unclickable rather than being sent somewhere plausible.
export function routeFor(n) {
  if (!n) return null
  if (n.ticketId != null) return `/support/t/${n.ticketId}`
  if (n.reservationId != null) return '/bookings'
  if (n.flat?.id != null) return `/apartments/${n.flat.id}`
  return null
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// "3 hours ago", in the reader's own language, from Intl — a hand-written
// table would need every plural form of three languages to say the same
// thing. Anything older than a week reads as a date instead: "47 days ago"
// is arithmetic, not information.
export function relativeTime(iso, lang = 'en') {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = then - Date.now()
  const abs = Math.abs(diff)
  if (abs >= 7 * DAY) {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(then)
  }
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour')
  return rtf.format(Math.round(diff / DAY), 'day')
}

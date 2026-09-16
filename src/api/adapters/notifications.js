// DTO adapter for `/mobileApi/notification/` (docs/api-reference.md).
//
// The payload nests a whole flat object inside every row and repeats the
// customer id on each one; the list needs neither. What it does need is a
// destination, and the DTO states that three different ways — `ticket`,
// `reservation` and `flat` — so those are flattened to ids here and turned
// into a route by the caller.
//
// `type` is a free string the backend sets per event. Its full set is not
// documented (README question, 2026-09-16), so nothing here switches on a
// closed list: an unknown type keeps its text and falls back to a neutral
// glyph rather than disappearing.

// Live `datetime` is "YYYY-MM-DD HH:MM:SS" with no timezone, exactly like
// news' `created_at`. Read as UTC so ordering and "2 hours ago" do not shift
// between a developer's machine and CI.
function parseAt(value) {
  if (!value) return null
  const iso = typeof value === 'string' && value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function adaptNotification(dto) {
  if (!dto || dto.id == null) return null
  const at = parseAt(dto.datetime)
  return {
    id: dto.id,
    at: at ? at.toISOString() : null,
    // Sort key: rows with no readable date sink to the bottom rather than
    // jumping to the top on a NaN comparison.
    ts: at ? at.getTime() : 0,
    msg: (dto.msg || '').trim(),
    note: (dto.note || '').trim(),
    type: dto.type || '',
    seen: dto.seen === true,
    ticketId: dto.ticket ?? null,
    reservationId: dto.reservation ?? null,
    flat: dto.flat && dto.flat.id != null
      ? { id: dto.flat.id, name: dto.flat.apartmentName || dto.flat.flat || '' }
      : null,
  }
}

export function adaptNotifications(dto) {
  const rows = Array.isArray(dto) ? dto : Array.isArray(dto?.result) ? dto.result : []
  return rows.map(adaptNotification).filter(Boolean).sort((a, b) => b.ts - a.ts)
}

// Newest first is what the panel shows; the unread count is what the bell
// shows. Both read the same array, so they can never disagree.
export function unreadCount(items) {
  return (items || []).reduce((n, i) => n + (i.seen ? 0 : 1), 0)
}

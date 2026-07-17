// DTO adapters for `/mobileApi/tickets/`, `/mobileApi/tickets/{id}/messages/`,
// and `/mobileApi/tickets/subject/`, aligned to the REAL captured payloads
// (Task L1 — scratchpad/sdd/live-payloads.json `ticket_first`/`subjects`):
//  - the list envelope's `result` is `{limit, offset, totalNewMessages,
//    totalTickets, data: [...]}` — items live under `data`, not `results`.
//  - `ticket.status` is a localized OBJECT `{id, en, ru, ka}` (live: New/
//    Новый/ახალი), not an open/closed string. The localized text is
//    displayed directly (statusLabel below); the active/closed bucket the UI
//    filters and gates the composer on comes from `closed_at` presence.
//  - `customerId` is an embedded customer object, not a bare id.
//  - `subject` is a plain string that exact-matches one of the
//    `/tickets/subject/` entries' localized copy (confirmed live: subject
//    "Technical problem" === subjects[1].en).
// Explicit .js extension: plain Node ESM (scripts/live-smoke.mjs imports
// this module directly, with no bundler) requires it — Vite resolves either
// form fine, so this is a no-op for the app build/tests.
import { topicById } from '../mock/tickets.js'

const OTHER_TOPIC = topicById('other')

// Live tickets have no open/closed status string — `closed_at` presence is
// the closed signal (status.id's value set is unenumerated, so it isn't
// trusted for bucketing). A literal 'closed' status string is still honored
// defensively for any legacy/alternate payload.
function ticketStatus(dto) {
  if (dto.closed_at || dto.status === 'closed') return 'closed'
  return 'active'
}

// The localized status text to display verbatim (live: {id,en,ru,ka}).
// Picked by UI lang with EN fallback; undefined when status isn't the live
// object shape, so consumers (TicketList/TicketChatPane) fall back to the
// mock TSTATUS labels.
function ticketStatusLabel(dto, lang) {
  if (!dto.status || typeof dto.status !== 'object') return undefined
  const label = dto.status[lang] ?? dto.status.en
  return typeof label === 'string' ? label.trim() : undefined
}

// "YYYY-MM-DD HH:MM" — matches the `created` format
// src/api/endpoints/support.js's timestamps()/TICKETS mock already use.
// Live timestamps are "YYYY-MM-DD HH:MM:SS" with no timezone — treated as
// UTC (normalized to ISO+Z) so formatting doesn't shift across timezones.
function parseServerDate(value) {
  if (!value) return null
  const iso = typeof value === 'string' && value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatCreated(value) {
  const d = parseServerDate(value)
  if (!d) return '—'
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// Best-effort EN-keyword classifier, used only as a last resort when a
// ticket's `subject` doesn't exactly match anything in the adapted subjects
// list (e.g. subjects weren't loaded, or the API added a new localized
// string). The live subject copy ("Financial Issues", "Technical problem",
// "Booking questions") is covered; anything unmatched lands on 'other'.
const TOPIC_KEYWORDS = [
  ['payment', /payment|billing|charge|invoice|financ/i],
  ['technical', /technical|not working|isn.t working|error|bug/i],
  ['booking', /booking|reservation/i],
  ['access', /access card|digital key|\bkey\b/i],
  ['internet', /internet|wi-?fi|television|\btv\b/i],
]

function classify(text = '') {
  for (const [id, re] of TOPIC_KEYWORDS) {
    if (re.test(text)) return id
  }
  return 'other'
}

// Matches a ticket's raw `subject` string against the adapted subjects list
// (see adaptSubjects below, which keeps the original en/ru/ka copy alongside
// the SUPPORT_TOPICS-shaped fields precisely so this lookup is possible) and
// returns the matching topic id. Falls through to the keyword classifier,
// then to 'other'. Confirmed live: ticket subjects exactly equal one of the
// subject-catalog strings.
function topicFromSubject(subject = '', subjects = []) {
  const hit = subjects.find((s) => s.en === subject || s.ru === subject || s.ka === subject)
  return hit ? hit.id : classify(subject)
}

// One Ticket -> the v1 ticket shape (TICKETS mock, minus `msgs` which comes
// from a separate `/tickets/{id}/messages/` call — adaptTicketMessages),
// plus two real-mode-only display fields the mock never carries:
//  - statusLabel: the backend's own localized status text (shown verbatim
//    instead of a TSTATUS mapping the live vocabulary doesn't fit)
//  - statusTone: badge tone — 'muted' once closed_at is set, 'pos' otherwise
// No apartment/flat reference field exists on Ticket (confirmed live) — so
// `apt` is always null (the v1 "general request" case).
export function adaptTicket(dto = {}, subjects = [], lang = 'en') {
  return {
    id: dto.id,
    topic: topicFromSubject(dto.subject, subjects),
    apt: null,
    status: ticketStatus(dto),
    statusLabel: ticketStatusLabel(dto, lang),
    statusTone: dto.closed_at ? 'muted' : 'pos',
    created: dto.created_at ? formatCreated(dto.created_at) : '—',
    preview: dto.last_msg ?? '',
    msgs: [],
  }
}

// `/tickets/`'s envelope `result` is `{limit, offset, totalNewMessages,
// totalTickets, data: [...]}` (confirmed live). `results` (the old DRF
// guess) and a bare array are still accepted defensively.
export function adaptTicketList(dto = {}, subjects = [], lang = 'en') {
  const results = Array.isArray(dto) ? dto : dto.data || dto.results || []
  return results.map((t) => adaptTicket(t, subjects, lang))
}

// "DD.MM.YYYY" + "HH:MM" — matches the msg-entry date/time format
// src/api/mock/tickets.js's TICKETS already use (e.g. "09.07.2026" / "14:20").
function msgDateTime(value) {
  const d = parseServerDate(value)
  if (!d) return { date: '—', time: '—' }
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return { date: `${dd}.${mm}.${yyyy}`, time: `${hh}:${mi}` }
}

// `/tickets/{id}/messages/` message fields per the doc:
// `{id,created_at,ticketId,reply,author,message,authorFullname,files}` — no
// live message payload was captured in this round. `me` keeps the reply===0
// heuristic ("the customer's own message" vs staff replies). The live ticket
// list's `author: 0` on a customer-created ticket is consistent with 0
// meaning "the customer side", but FLAG: still unverified against a real
// multi-message thread — if `reply` turns out to be a thread counter, every
// customer follow-up would be misclassified. A pragmatic author/
// authorFullname comparison isn't possible here: the messages payload never
// repeats the ticket's customer identity to compare against.
export function adaptTicketMessage(dto = {}) {
  const { date, time } = msgDateTime(dto.created_at)
  const me = dto.reply === 0
  return {
    me,
    ...(me ? {} : { who: dto.authorFullname || undefined }),
    date,
    time,
    text: dto.message ?? '',
    files: (dto.files || []).map((f) => ({ id: f.id, size: f.size, type: f.type, url: f.url })),
  }
}

export function adaptTicketMessages(dto = []) {
  const list = Array.isArray(dto) ? dto : dto.data || dto.results || []
  return list.map(adaptTicketMessage)
}

// `/tickets/subject/`'s `[{en,ru,ka}]` (shape confirmed live) -> a
// SUPPORT_TOPICS-shaped list. The API has no topic id or icon/tint chrome of
// its own, so each entry is matched (via the keyword classifier) to one of
// the six static SUPPORT_TOPICS ids, borrowing that entry's desc/icon/tint —
// only `label` comes from the API response (in `lang`, default 'en'). The
// original en/ru/ka strings are kept on the returned object so
// topicFromSubject() can match a ticket's raw subject text against them
// regardless of which locale it was submitted in.
export function adaptSubjects(dto = [], lang = 'en') {
  return dto.map((s) => {
    const id = classify(s.en || '')
    const topic = topicById(id) || OTHER_TOPIC
    return {
      id,
      label: s[lang] ?? s.en ?? '—',
      desc: topic.desc,
      icon: topic.icon,
      tintBg: topic.tintBg,
      tintCol: topic.tintCol,
      en: s.en ?? '',
      ru: s.ru ?? '',
      ka: s.ka ?? '',
    }
  })
}

// DTO adapters for `/mobileApi/tickets/`, `/mobileApi/tickets/{id}/messages/`,
// and `/mobileApi/tickets/subject/` (docs/api-reference.md "Tickets,
// notifications, feedback, devices, and news") into the v1 ticket shape
// src/api/mock/tickets.js already defines (`TICKETS`/`SUPPORT_TOPICS`).
import { topicById } from '../mock/tickets'

const OTHER_TOPIC = topicById('other')

// The Ticket list endpoint's own field set IS enumerated by the doc:
// `{id,subject,created_at,updated_at,updated_by,closed_at,depId,status,
// customerId,forwarded,new_messages,last_msg,last_msg_time}` — read
// verbatim below. Two gaps the doc leaves unresolved:
//  1. No apartment/flat reference field exists on Ticket at all (`depId`
//     reads as an internal support-department id, not a flat id) — so
//     `apt` can never be recovered from this endpoint and always falls
//     back to `null` (the v1 "general request" case). FLAG for
//     verification: if a real payload does carry a flat/apartment id under
//     a different name, this should read it instead.
//  2. `status`'s value set isn't enumerated (the brief just says
//     "open/closed -> active/closed"). Rather than trust an exact string
//     match, ticketStatus() treats a present `closed_at` OR a literal
//     `'closed'` status as closed and everything else as active — a
//     conservative reading that can't accidentally strand a ticket in the
//     wrong bucket if the real status vocabulary turns out wider (e.g. an
//     'in_progress'/'pending' value).
function ticketStatus(dto) {
  if (dto.closed_at || dto.status === 'closed') return 'closed'
  return 'active'
}

// "YYYY-MM-DD HH:MM" — matches the `created` format
// src/api/endpoints/support.js's timestamps()/TICKETS mock already use.
function formatCreated(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// Best-effort EN-keyword classifier, used only as a last resort when a
// ticket's free-text `subject` doesn't exactly match anything in the
// adapted subjects list (e.g. subjects weren't loaded, or the API added a
// new localized string). Matches against known SUPPORT_TOPICS labels — this
// is a guess dressed up as a fallback, not a real localization strategy;
// FLAG for verification once live subject copy is available.
const TOPIC_KEYWORDS = [
  ['payment', /payment|billing|charge|invoice/i],
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
// (see adaptSubjects below, which keeps the original en/ru/ka copy
// alongside the SUPPORT_TOPICS-shaped fields precisely so this lookup is
// possible) and returns the matching topic id, per the brief: "maps
// subject -> topic id by matching against adapted subjects (fallback topic
// 'other')". Falls through to the keyword classifier, then to 'other', if
// no exact match is found in `subjects`.
function topicFromSubject(subject = '', subjects = []) {
  const hit = subjects.find((s) => s.en === subject || s.ru === subject || s.ka === subject)
  return hit ? hit.id : classify(subject)
}

// One Ticket -> the v1 ticket shape (TICKETS mock, minus `msgs` which comes
// from a separate `/tickets/{id}/messages/` call — adaptTicketMessages).
export function adaptTicket(dto = {}, subjects = []) {
  return {
    id: dto.id,
    topic: topicFromSubject(dto.subject, subjects),
    apt: null, // see file-header note 1 — no flat/apartment field on Ticket
    status: ticketStatus(dto),
    created: dto.created_at ? formatCreated(dto.created_at) : '—',
    preview: dto.last_msg ?? '',
    msgs: [],
  }
}

// `/tickets/`'s doc-elided "ticket list/pagination payload" — following the
// same DRF-style `{count,next,previous,results}` envelope `/news/` uses
// (consistent with `/tickets/` also taking `limit`/`offset` pagination
// params), OR a bare array if the caller already unwrapped it. Returns a
// plain array, matching what src/api/endpoints/support.js's listTickets()
// already resolves to under the mock.
export function adaptTicketList(dto = {}, subjects = []) {
  const results = Array.isArray(dto) ? dto : dto.results || []
  return results.map((t) => adaptTicket(t, subjects))
}

// "DD.MM.YYYY" + "HH:MM" — matches the msg-entry date/time format
// src/api/mock/tickets.js's TICKETS already use (e.g. "09.07.2026" / "14:20").
function msgDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return { date: `${dd}.${mm}.${yyyy}`, time: `${hh}:${mi}` }
}

// `/tickets/{id}/messages/`'s message fields ARE enumerated by the doc:
// `{id,created_at,ticketId,reply,author,message,authorFullname,
// files:[{id,size,type,url}]}`. The one field the doc leaves semantically
// ambiguous is `reply`: there's no author/customer-id cross-reference
// available here (the messages endpoint never repeats the ticket's
// `customerId`), so `me` is inferred from `reply === 0` — read as "this is
// the ticket's original/customer message" vs. any nonzero `reply` being a
// staff reply. FLAG for live verification: if `reply` instead means
// something like "this is reply #N in the thread" (counting all messages,
// customer included), this heuristic would misclassify every message after
// the first customer follow-up.
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
  const list = Array.isArray(dto) ? dto : dto.results || []
  return list.map(adaptTicketMessage)
}

// `/tickets/subject/`'s `[{en,ru,ka}]` -> a SUPPORT_TOPICS-shaped list. The
// API has no topic id or icon/tint chrome of its own, so each entry is
// matched (via the same best-effort keyword classifier used above) to one
// of the six static SUPPORT_TOPICS ids, borrowing that entry's desc/icon/
// tint — only `label` comes from the API response (in `lang`, default
// 'en'). The original `en`/`ru`/`ka` strings are kept on the returned
// object (beyond the SUPPORT_TOPICS shape) specifically so
// topicFromSubject() above can match a ticket's raw subject text against
// them regardless of which locale it was submitted in.
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

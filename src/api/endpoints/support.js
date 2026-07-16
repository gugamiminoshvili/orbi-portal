import { USE_MOCK, delay, http, httpMultipart } from '../client'
import { TICKETS, nextTicketId, topicById } from '../mock/tickets'
import { adaptSubjects, adaptTicket, adaptTicketList, adaptTicketMessages } from '../adapters/support'

function pad(n) {
  return String(n).padStart(2, '0')
}

// mirrors the prototype's two date formats: `created` uses ISO-ish
// `YYYY-MM-DD HH:MM`, message entries use `DD.MM.YYYY` + separate `HH:MM`.
function timestamps() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { created: `${yyyy}-${mm}-${dd} ${time}`, msgDate: `${dd}.${mm}.${yyyy}`, time }
}

// GET /mobileApi/tickets/subject/ has no per-request variation (it's a
// static localized-subject catalog), so it's fetched once per session and
// module-cached — every real-branch call below that needs `subjects` shares
// this single in-flight/resolved promise instead of re-fetching.
let subjectsPromise = null
function getSubjects() {
  if (!subjectsPromise) {
    subjectsPromise = http('/mobileApi/tickets/subject/').then((dto) => adaptSubjects(dto))
  }
  return subjectsPromise
}

// Some doc-elided "list/pagination payload" responses may already be a bare
// array; others (like /tickets/{id}/) describe a "list service result
// containing Ticket" which could mean an array of one. Normalize either way.
function firstOrSelf(dto) {
  if (Array.isArray(dto)) return dto[0]
  if (dto && Array.isArray(dto.results)) return dto.results[0]
  return dto
}

export async function listTickets() {
  if (USE_MOCK) {
    await delay()
    return TICKETS
  }
  const [dto, subjects] = await Promise.all([http('/mobileApi/tickets/'), getSubjects()])
  return adaptTicketList(dto, subjects)
}

export async function getTicket(id) {
  if (USE_MOCK) {
    await delay()
    return TICKETS.find((t) => t.id === id)
  }
  const [ticketDtoRaw, subjects, messagesDto] = await Promise.all([
    http(`/mobileApi/tickets/${id}/`),
    getSubjects(),
    http(`/mobileApi/tickets/${id}/messages/`),
  ])
  const ticketDto = firstOrSelf(ticketDtoRaw)
  if (!ticketDto) return undefined
  const ticket = adaptTicket(ticketDto, subjects)
  ticket.msgs = adaptTicketMessages(messagesDto)
  return ticket
}

// The doc only says ticket creation needs "ticket subject/category/message
// data" without naming fields — FLAG: `subject` is submitted as the matching
// subject's own English copy (round-tripping what /tickets/subject/ handed
// back), `message` as the free-text body. `apt`/flat association has no
// confirmed field name (see adapters/support.js's file-header note) so it's
// deliberately left off the request body rather than guessing a wrong key.
export async function createTicket({ topic, apt, text }) {
  if (USE_MOCK) {
    await delay()
    const { created, msgDate, time } = timestamps()
    const ticket = {
      id: nextTicketId(),
      topic,
      apt,
      status: 'active',
      created,
      preview: text,
      msgs: [{ me: true, date: msgDate, time, text }],
    }
    TICKETS.unshift(ticket)
    return ticket
  }
  const subjects = await getSubjects()
  const subject = subjects.find((s) => s.id === topic)
  const dto = await http('/mobileApi/tickets/', {
    method: 'POST',
    body: JSON.stringify({ subject: subject?.en || topicById(topic)?.label || topic, message: text }),
  })
  const ticket = adaptTicket(firstOrSelf(dto), subjects)
  const { msgDate, time } = timestamps()
  ticket.msgs = [{ me: true, date: msgDate, time, text }]
  return ticket
}

// POST /tickets/{id}/messages/ only answers with `{result:{msgId}}` (docs/
// api-reference.md), not a full updated ticket — so the real branch re-fetches
// getTicket(id) afterwards to hand the caller the same "whole ticket with
// msgs" shape the mock branch (and TicketChatPane) expect.
export async function sendMessage(id, text) {
  if (USE_MOCK) {
    await delay()
    const ticket = TICKETS.find((t) => t.id === id)
    const { msgDate, time } = timestamps()
    ticket.msgs.push({ me: true, date: msgDate, time, text })
    ticket.preview = text
    return ticket
  }
  await http(`/mobileApi/tickets/${id}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ message: text }),
  })
  return getTicket(id)
}

// New in I6 for the support attach button (TicketChatPane real mode).
// Mock branch returns a fake stored-file path so the function is safe to
// call under either mode; the mock UI path never actually calls it (it
// keeps its existing toast-only stub).
export async function uploadTicketFile(ticketId, file) {
  if (USE_MOCK) {
    await delay()
    return `mock/ticket_file/${Date.now()}/`
  }
  const form = new FormData()
  form.append('file', file)
  form.append('ticketId', String(ticketId))
  return httpMultipart('/mobileApi/tickets/file/', { method: 'POST', body: form })
}

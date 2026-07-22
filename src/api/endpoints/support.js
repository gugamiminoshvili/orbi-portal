import { USE_MOCK, delay, http, httpMultipart } from '../client'
import { TICKETS, nextTicketId, topicById } from '../mock/tickets'
import i18n from '../../i18n'
import { adaptSubjects, adaptTicket, adaptTicketList, adaptTicketMessages } from '../adapters/support'
import { flatId } from '../adapters/apartments'

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

// Some responses may already be a bare array; the live list envelope nests
// items under `data` (Task L1); older guesses used DRF's `results`.
// Normalize any of the three to "the first item".
function firstOrSelf(dto) {
  if (Array.isArray(dto)) return dto[0]
  if (dto && Array.isArray(dto.data)) return dto.data[0]
  if (dto && Array.isArray(dto.results)) return dto.results[0]
  return dto
}

export async function listTickets() {
  if (USE_MOCK) {
    await delay()
    return TICKETS
  }
  const [dto, subjects] = await Promise.all([http('/mobileApi/tickets/'), getSubjects()])
  return adaptTicketList(dto, subjects, i18n.language)
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
  const ticket = adaptTicket(ticketDto, subjects, i18n.language)
  ticket.msgs = adaptTicketMessages(messagesDto)
  return ticket
}

// `subject` is submitted as the matching subject's own English copy
// (round-tripping what /tickets/subject/ handed back — confirmed live that
// stored ticket subjects exactly equal a subject-catalog string), `message`
// as the free-text body. `apts` is the (possibly empty) list of selected
// apartment objects; per the backend spec these map to a `roomsId: number[]`
// array — sent only when non-empty, omitted entirely for a general ticket.
// The GET ticket shape doesn't (yet) echo rooms back, so the created ticket
// carries the selected `apts` client-side for immediate display.
export async function createTicket({ topic, apts = [], text }) {
  if (USE_MOCK) {
    await delay()
    const { created, msgDate, time } = timestamps()
    const ticket = {
      id: nextTicketId(),
      topic,
      apts,
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
  const roomsId = apts.map((a) => flatId(a)).filter((v) => v != null)
  const body = { subject: subject?.en || topicById(topic)?.label || topic, message: text }
  if (roomsId.length) body.roomsId = roomsId
  const dto = await http('/mobileApi/tickets/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const ticket = adaptTicket(firstOrSelf(dto), subjects, i18n.language)
  ticket.apts = apts
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

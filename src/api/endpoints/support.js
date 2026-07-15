import { USE_MOCK, delay, http } from '../client'
import { TICKETS, nextTicketId } from '../mock/tickets'

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

export async function listTickets() {
  if (USE_MOCK) {
    await delay()
    return TICKETS
  }
  return http('/tickets')
}

export async function getTicket(id) {
  if (USE_MOCK) {
    await delay()
    return TICKETS.find((t) => t.id === id)
  }
  return http(`/tickets/${id}`)
}

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
  return http('/tickets', {
    method: 'POST',
    body: JSON.stringify({ topic, apt, text }),
  })
}

export async function sendMessage(id, text) {
  if (USE_MOCK) {
    await delay()
    const ticket = TICKETS.find((t) => t.id === id)
    const { msgDate, time } = timestamps()
    ticket.msgs.push({ me: true, date: msgDate, time, text })
    ticket.preview = text
    return ticket
  }
  return http(`/tickets/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

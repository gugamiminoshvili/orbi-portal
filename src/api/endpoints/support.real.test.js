// Real-branch tests for src/api/endpoints/support.js — see news.real.test.js
// for the vi.mock('../client', ...) pattern used to force USE_MOCK false.
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn(), httpMultipart: vi.fn() }
})

import { http, httpMultipart } from '../client'
import { listTickets, getTicket, createTicket, sendMessage, uploadTicketFile } from './support'
import tickets from '../adapters/__fixtures__/tickets.json'
import ticketMessages from '../adapters/__fixtures__/ticket-messages.json'
import subjects from '../adapters/__fixtures__/subjects.json'

beforeEach(() => {
  http.mockReset()
  httpMultipart.mockReset()
})

describe('listTickets (real branch)', () => {
  test('fetches tickets + subjects (once) and adapts the {data} envelope', async () => {
    http.mockImplementation((path) => {
      if (path === '/mobileApi/tickets/') return Promise.resolve(tickets)
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      throw new Error(`unexpected path ${path}`)
    })

    const list = await listTickets()

    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ id: 101245, topic: 'technical', status: 'active', statusLabel: 'New', statusTone: 'pos' })
    expect(list[1]).toMatchObject({ id: 101210, status: 'closed', statusTone: 'muted' })
  })

  test('module-caches the subjects fetch across calls', async () => {
    // Isolated via resetModules + a fresh dynamic import: support.js's
    // subjects cache is a module-level variable, so reusing the top-level
    // `listTickets` import here would inherit whatever the previous test
    // already cached instead of proving the caching behavior itself.
    vi.resetModules()
    const freshClient = await import('../client')
    const { listTickets: freshListTickets } = await import('./support')
    let subjectCalls = 0
    freshClient.http.mockImplementation((path) => {
      if (path === '/mobileApi/tickets/') return Promise.resolve(tickets)
      if (path === '/mobileApi/tickets/subject/') {
        subjectCalls += 1
        return Promise.resolve(subjects)
      }
      throw new Error(`unexpected path ${path}`)
    })

    await freshListTickets()
    await freshListTickets()

    expect(subjectCalls).toBe(1)
  })
})

describe('getTicket (real branch)', () => {
  test('fetches ticket + messages and merges them', async () => {
    http.mockImplementation((path) => {
      if (path === '/mobileApi/tickets/101245/') return Promise.resolve(tickets.data[0])
      if (path === '/mobileApi/tickets/101245/messages/') return Promise.resolve(ticketMessages)
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      throw new Error(`unexpected path ${path}`)
    })

    const ticket = await getTicket(101245)

    expect(ticket).toMatchObject({ id: 101245, topic: 'technical', status: 'active', statusLabel: 'New' })
    expect(ticket.msgs).toHaveLength(2)
    expect(ticket.msgs[0]).toMatchObject({ me: true })
    expect(ticket.msgs[1]).toMatchObject({ me: false, who: 'ORBI Support' })
  })
})

describe('createTicket (real branch)', () => {
  test('POSTs subject (matched from cached subjects) + message', async () => {
    http.mockImplementation((path, opts) => {
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      if (path === '/mobileApi/tickets/' && opts?.method === 'POST') {
        return Promise.resolve({ ...tickets.data[0], id: 999, subject: JSON.parse(opts.body).subject })
      }
      throw new Error(`unexpected call ${path}`)
    })

    const ticket = await createTicket({ topic: 'booking', apt: null, text: 'hello there' })

    const createCall = http.mock.calls.find(([path]) => path === '/mobileApi/tickets/')
    const body = JSON.parse(createCall[1].body)
    // round-trips the subject catalog's own English copy — confirmed live
    // that stored ticket subjects exactly equal a catalog string
    expect(body).toEqual({ subject: 'Booking questions', message: 'hello there' })
    expect(ticket.id).toBe(999)
    expect(ticket.topic).toBe('booking')
    expect(ticket.msgs[0]).toMatchObject({ me: true, text: 'hello there' })
  })

  test('a topic with no live subject-catalog match falls back to the static label', async () => {
    http.mockImplementation((path, opts) => {
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      if (path === '/mobileApi/tickets/' && opts?.method === 'POST') {
        return Promise.resolve({ ...tickets.data[0], id: 1000, subject: JSON.parse(opts.body).subject })
      }
      throw new Error(`unexpected call ${path}`)
    })

    await createTicket({ topic: 'other', apt: null, text: 'misc' })

    const createCall = http.mock.calls.find(([path]) => path === '/mobileApi/tickets/')
    expect(JSON.parse(createCall[1].body).subject).toBe('Other Request')
  })

  test('sends roomsId (flatId of each selected apartment) and carries apts back', async () => {
    http.mockImplementation((path, opts) => {
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      if (path === '/mobileApi/tickets/' && opts?.method === 'POST') {
        return Promise.resolve({ ...tickets.data[0], id: 1001, subject: JSON.parse(opts.body).subject })
      }
      throw new Error(`unexpected call ${path}`)
    })

    const apts = [
      { objectId: 123, code: 'OCT.A.15.1519' },
      { id: 1222, code: 'OCT.A.30.3026' },
    ]
    const ticket = await createTicket({ topic: 'technical', apts, text: 'broken' })

    const createCall = http.mock.calls.find(([path]) => path === '/mobileApi/tickets/')
    // flatId prefers objectId, falls back to id
    expect(JSON.parse(createCall[1].body).roomsId).toEqual([123, 1222])
    // the just-created ticket carries the selected apartments for display
    expect(ticket.apts).toEqual(apts)
  })

  test('omits roomsId entirely when no apartment is selected', async () => {
    http.mockImplementation((path, opts) => {
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      if (path === '/mobileApi/tickets/' && opts?.method === 'POST') {
        return Promise.resolve({ ...tickets.data[0], id: 1002, subject: JSON.parse(opts.body).subject })
      }
      throw new Error(`unexpected call ${path}`)
    })

    await createTicket({ topic: 'other', apts: [], text: 'misc' })

    const createCall = http.mock.calls.find(([path]) => path === '/mobileApi/tickets/')
    expect(JSON.parse(createCall[1].body)).not.toHaveProperty('roomsId')
  })
})

describe('sendMessage (real branch)', () => {
  test('POSTs {message} then refetches the full ticket', async () => {
    http.mockImplementation((path, opts) => {
      if (path === '/mobileApi/tickets/101245/messages/' && opts?.method === 'POST') {
        return Promise.resolve({ result: { msgId: 5 } })
      }
      if (path === '/mobileApi/tickets/101245/') return Promise.resolve(tickets.data[0])
      if (path === '/mobileApi/tickets/101245/messages/') return Promise.resolve(ticketMessages)
      if (path === '/mobileApi/tickets/subject/') return Promise.resolve(subjects)
      throw new Error(`unexpected call ${path}`)
    })

    const ticket = await sendMessage(101245, 'more please')

    const sendCall = http.mock.calls.find(([path, opts]) => path === '/mobileApi/tickets/101245/messages/' && opts?.method === 'POST')
    expect(JSON.parse(sendCall[1].body)).toEqual({ message: 'more please' })
    expect(ticket.id).toBe(101245)
    expect(ticket.msgs).toHaveLength(2) // re-fetched canonical state, not a locally-appended guess
  })
})

describe('uploadTicketFile (real branch)', () => {
  test('uploads via httpMultipart with a FormData body, no manual Content-Type', async () => {
    httpMultipart.mockResolvedValueOnce('ticket_file/1/')
    const file = new File(['abc'], 'photo.png', { type: 'image/png' })

    const url = await uploadTicketFile(101245, file)

    expect(url).toBe('ticket_file/1/')
    const [path, opts] = httpMultipart.mock.calls[0]
    expect(path).toBe('/mobileApi/tickets/file/')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('file')).toBe(file)
    expect(opts.body.get('ticketId')).toBe('101245')
    expect(opts.headers).toBeUndefined()
  })
})

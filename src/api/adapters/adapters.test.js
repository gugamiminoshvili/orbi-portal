import { describe, test, expect } from 'vitest'
import { adaptProperty, adaptFlatDetail } from './apartments'
import { adaptNewsList, adaptNewsItem } from './news'
import { adaptAgreement, adaptTariffs } from './internet'
import { adaptTicket, adaptTicketList, adaptTicketMessage, adaptTicketMessages, adaptSubjects } from './support'
import { adaptLockHistory, adaptTransaction, adaptTransactions } from './finance'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import { PLANS, BOOSTS } from '../mock/plans'
import { TICKETS, SUPPORT_TOPICS, topicById } from '../mock/tickets'
import properties from './__fixtures__/properties.json'
import flat from './__fixtures__/flat.json'
import news from './__fixtures__/news.json'
import agreement from './__fixtures__/internettv-agreement.json'
import tariffs from './__fixtures__/internettv-tariff.json'
import tickets from './__fixtures__/tickets.json'
import ticketMessages from './__fixtures__/ticket-messages.json'
import subjects from './__fixtures__/subjects.json'
import lockHistory from './__fixtures__/lock-history.json'
import financeTransactions from './__fixtures__/finance-transactions.json'

describe('adaptProperty', () => {
  test('maps verbatim /properties/ fields into the v1 Apt shape', () => {
    const apt = adaptProperty(properties[0])
    expect(apt).toMatchObject({
      id: 501,
      objectId: 3026,
      project: 'Orbi City',
      code: 'OCT.A.30.3026',
      block: 'A',
      number: '3026',
      floor: 30,
      area: 42,
      epcode: 'GE-BAT-OCT-A-3026',
      balance: -180,
      role: 'Owner',
    })
  })

  test('maps ownership_status to Co-Owner and Trusted', () => {
    expect(adaptProperty(properties[1]).role).toBe('Co-Owner')
    expect(adaptProperty(properties[2]).role).toBe('Trusted')
  })

  test('unmapped/missing ownership_status falls back to Owner', () => {
    expect(adaptProperty({ ownership_status: 'something_else' }).role).toBe('Owner')
    expect(adaptProperty({}).role).toBe('Owner')
  })

  test('non-numeric apartmentBalance parses to 0, not NaN', () => {
    const apt = adaptProperty(properties[2])
    expect(apt.balance).toBe(0)
    expect(Number.isNaN(apt.balance)).toBe(false)
  })

  test('missing epcode falls back to the em-dash placeholder', () => {
    expect(adaptProperty(properties[2]).epcode).toBe('—')
  })

  test('synthesizes services with real balances/indication from the property fields', () => {
    const { services } = adaptProperty(properties[0])
    expect(services.maintenance.balance).toBe(-180)
    expect(services.electricity.balance).toBe(-60)
    expect(services.water.indication).toBe('00512 m³')
    expect(services.internet.balance).toBe(0)
  })

  test('fields the properties list does not carry get documented, render-safe fallbacks', () => {
    const { services } = adaptProperty(properties[0])
    // numeric fields piped through fmt() -> 0, never NaN/undefined
    expect(services.maintenance.tariff).toBe(0)
    expect(services.internet.tariff).toBe(0)
    expect(services.internet.daysLeft).toBe(0)
    expect(services.internet.cycleDays).toBe(0)
    // plain-text fields -> the app's '—' unknown placeholder
    expect(services.maintenance.start).toBe('—')
    expect(services.water.counter).toBe('—')
    expect(services.water.updated).toBe('—')
    expect(services.electricity.counter).toBe('—')
    expect(services.electricity.updated).toBe('—')
    expect(services.internet.provider).toBe('—')
    expect(services.internet.renewal).toBe('—')
    // internet has no known active plan from this endpoint -> falsy, so
    // InternetCard's `!s.planId` empty-state branch renders instead of a
    // fabricated Active/Paused status
    expect(services.internet.planId).toBeNull()
    expect(services.internet.boost).toBeNull()
  })
})

describe('adaptFlatDetail', () => {
  test('maps Flat/OneC fields into the detail-page-only fields', () => {
    expect(adaptFlatDetail(flat)).toEqual({
      id: 3026,
      project: 'Orbi City',
      code: 'OCT.A.30.3026',
      block: 'A',
      building: 'Orbi City, Block A',
      addr: 'Sherif Khimshiashvili St 5, Batumi',
      cadastral: '05.32.03.129.22',
      waterCode: 'WTR-3026',
      apCode: 'AP-OCTA303026',
    })
  })

  test('unknown fields fall back to the em-dash placeholder', () => {
    const detail = adaptFlatDetail({})
    expect(detail.project).toBe('—')
    expect(detail.code).toBe('—')
    expect(detail.block).toBe('—')
    expect(detail.building).toBe('—')
    expect(detail.addr).toBe('—')
    expect(detail.cadastral).toBe('—')
    expect(detail.waterCode).toBe('—')
    expect(detail.apCode).toBe('—')
  })
})

describe('adaptProperty + adaptFlatDetail cover every key the UI reads off an apartment', () => {
  // Every `apt.<key>` / `apartment.<key>` access across ApartmentCard,
  // ApartmentDetailPage, the 5 service accordions, and PayPage (grep -rohE
  // '\bapt\.[a-zA-Z_]+|\bapartment\.[a-zA-Z_]+' src/features).
  const KEYS_UI_READS = [
    'id', 'project', 'code', 'block', 'number', 'floor', 'area', 'balance',
    'role', 'building', 'cadastral', 'waterCode', 'apCode', 'services',
  ]

  test('merged adapter output has every key the real mock Apt has that the UI reads', () => {
    const merged = { ...adaptProperty(properties[0]), ...adaptFlatDetail(flat) }
    for (const key of KEYS_UI_READS) {
      expect(merged).toHaveProperty(key)
    }
    // sanity: every one of these keys is also present on the real mock Apt
    // as returned by getApartment()/listApartments() (APTS entry + its
    // SERVICES[id] merged in) — i.e. we're not asserting keys the mock
    // itself doesn't have either.
    const realApt = { ...APTS[0], services: SERVICES[APTS[0].id] }
    for (const key of KEYS_UI_READS) {
      expect(realApt).toHaveProperty(key)
    }
  })

  test('merged services object has every key each service card reads', () => {
    const merged = { ...adaptProperty(properties[0]), ...adaptFlatDetail(flat) }
    expect(merged.services.maintenance).toEqual(
      expect.objectContaining({ balance: expect.any(Number), tariff: expect.any(Number), start: expect.any(String) })
    )
    expect(merged.services.water).toEqual(
      expect.objectContaining({ counter: expect.any(String), indication: expect.any(String), updated: expect.any(String) })
    )
    expect(merged.services.electricity).toEqual(
      expect.objectContaining({
        counter: expect.any(String),
        status: expect.any(String),
        balance: expect.any(Number),
        updated: expect.any(String),
      })
    )
    expect(merged.services.internet).toEqual(
      expect.objectContaining({
        provider: expect.any(String),
        balance: expect.any(Number),
        tariff: expect.any(Number),
        renewal: expect.any(String),
        daysLeft: expect.any(Number),
        cycleDays: expect.any(Number),
      })
    )
    expect(merged.services.internet).toHaveProperty('planId')
    expect(merged.services.internet).toHaveProperty('boost')
  })
})

describe('adaptNewsList', () => {
  test('maps the DRF-paginated envelope to {items, count, next}', () => {
    const { items, count, next } = adaptNewsList(news)
    expect(count).toBe(14)
    expect(next).toBe('https://api.orbi.ge/mobileApi/news/?page=2')
    expect(items).toHaveLength(3)
  })

  test('maps a fully-populated article', () => {
    const item = adaptNewsItem(news.results[0])
    expect(item).toEqual({
      id: 101,
      cat: 'Announcement',
      ts: 20260606,
      date: 'Jun 6, 2026',
      title: 'New online payment methods now available for management fees',
      excerpt:
        'Owners can now settle monthly management and utility fees directly through the portal using Visa, Mastercard, and Georgian bank transfers — with instant receipts.',
      read: '3 min',
      seed: 101,
      img: 'https://cdn.orbi.ge/news/101/cover.jpg',
    })
  })

  test('article without an image omits the optional img key', () => {
    const item = adaptNewsItem(news.results[1])
    expect(item).not.toHaveProperty('img')
    expect(item.cat).toBe('Maintenance')
    expect(item.read).toBe('2 min') // no read_time on this fixture -> fallback
  })

  test('article missing category/description/read_time gets sensible fallbacks', () => {
    const item = adaptNewsItem(news.results[2])
    expect(item.cat).toBe('Announcement')
    expect(item.excerpt).toBe('')
    expect(item.read).toBe('2 min')
    expect(item.seed).toBe(103)
    expect(item.ts).toBe(20260529)
    expect(item.date).toBe('May 29, 2026')
  })

  test('missing/invalid created_at falls back to ts 0 and a placeholder date', () => {
    const item = adaptNewsItem({ id: 999 })
    expect(item.ts).toBe(0)
    expect(item.date).toBe('—')
  })

  test('empty dto list yields an empty, well-shaped result', () => {
    expect(adaptNewsList({})).toEqual({ items: [], count: 0, next: null })
  })
})

describe('adaptTariffs', () => {
  test('maps `combined` tariffs to the v1 PLANS shape', () => {
    const { plans } = adaptTariffs(tariffs)
    expect(plans).toEqual([
      { id: 'P1', name: 'Package 1', price: 50, mbps: 50, ch: 35 },
      { id: 'P2', name: 'Package 2', price: 70, mbps: 75, ch: 35 },
      { id: 'P3', name: 'Package 3', price: 110, mbps: 120, ch: 35 },
      { id: 'P4', name: 'Package 4', price: 150, mbps: 150, ch: 35 },
    ])
  })

  test('maps `boost` tariffs to the v1 BOOSTS shape, formatting speed/duration strings', () => {
    const { boosts } = adaptTariffs(tariffs)
    expect(boosts).toEqual([
      { id: 'b65', name: 'Boost 65', price: 10, speed: '+65 Mbps', duration: '24 hours' },
      { id: 'b150', name: 'Boost+ 150', price: 25, speed: '+150 Mbps', duration: '7 days' },
    ])
  })

  test('empty/missing tariff arrays yield empty plans and boosts', () => {
    expect(adaptTariffs({})).toEqual({ plans: [], boosts: [] })
  })

  test('every adapted plan/boost has every key PLANS/BOOSTS entries have', () => {
    const { plans, boosts } = adaptTariffs(tariffs)
    for (const key of Object.keys(PLANS[0])) {
      expect(plans[0]).toHaveProperty(key)
    }
    for (const key of Object.keys(BOOSTS[0])) {
      expect(boosts[0]).toHaveProperty(key)
    }
  })
})

describe('adaptAgreement', () => {
  test('maps an active agreement into the services.internet subscriber-state fields', () => {
    expect(adaptAgreement(agreement)).toEqual({
      provider: 'Silknet',
      planId: 'P2',
      tariff: 70,
      renewal: '19 Jul 2026',
      daysLeft: 3,
      cycleDays: 30,
      boost: { id: 'b65', name: 'Boost 65', price: 0, speed: '+65 Mbps', duration: '24 hours' },
      status: 'Active',
    })
  })

  test('an inactive/not-found agreement ({}) falls back to the no-active-subscription shape', () => {
    const s = adaptAgreement({})
    expect(s.planId).toBeNull()
    expect(s.boost).toBeNull()
    expect(s.status).toBeNull()
    expect(s.tariff).toBe(0)
    expect(s.daysLeft).toBe(0)
    expect(s.cycleDays).toBe(0)
    expect(s.provider).toBe('—')
    expect(s.renewal).toBe('—')
  })

  test('a paused agreement maps status to Paused', () => {
    expect(adaptAgreement({ status: 'paused' }).status).toBe('Paused')
  })

  test('an unrecognized status string falls back to null rather than a fabricated value', () => {
    expect(adaptAgreement({ status: 'something_else' }).status).toBeNull()
  })

  test('merged with a property-derived internet object, every key InternetCard/ChangePackageModal/BoostModal read is present', () => {
    // grep -rohE 's\.[a-zA-Z]+' src/features/apartments/services/InternetCard.jsx
    // plus apartment.services.internet.{planId,renewal,boost} from
    // ChangePackageModal/BoostModal. `balance`/`provider`/`status`/`planId`/
    // `tariff`/`renewal`/`daysLeft`/`cycleDays`/`boost` cover every one of
    // them; `plan`/`updated` on SERVICES.A1.internet are legacy fields no
    // current consumer reads (superseded by planId -> planById() lookups),
    // so they're intentionally not asserted here.
    const KEYS_UI_READS = ['balance', 'status', 'planId', 'provider', 'tariff', 'renewal', 'daysLeft', 'cycleDays', 'boost']
    const propertyInternet = adaptProperty(properties[0]).services.internet
    const merged = { ...propertyInternet, ...adaptAgreement(agreement) }
    for (const key of KEYS_UI_READS) {
      expect(merged).toHaveProperty(key)
    }
    for (const key of KEYS_UI_READS) {
      expect(SERVICES.A1.internet).toHaveProperty(key)
    }
  })
})

describe('adaptSubjects', () => {
  test('maps {en,ru,ka} entries to the SUPPORT_TOPICS shape, matching known labels to their static topic id', () => {
    const adapted = adaptSubjects(subjects)
    expect(adapted.map((s) => s.id)).toEqual(['payment', 'technical', 'booking', 'access', 'internet', 'other'])
  })

  test('label defaults to English and switches with the `lang` param', () => {
    const [payment] = adaptSubjects(subjects)
    expect(payment.label).toBe('Payment & Billing Issues')
    const [paymentKa] = adaptSubjects(subjects, 'ka')
    expect(paymentKa.label).toBe('გადახდისა და ბილინგის პრობლემები')
  })

  test('desc/icon/tint chrome is borrowed from the matching static SUPPORT_TOPICS entry', () => {
    const [payment] = adaptSubjects(subjects)
    const staticTopic = topicById('payment')
    expect(payment.desc).toBe(staticTopic.desc)
    expect(payment.icon).toBe(staticTopic.icon)
    expect(payment.tintBg).toBe(staticTopic.tintBg)
    expect(payment.tintCol).toBe(staticTopic.tintCol)
  })

  test('an unmatched label falls back to the "other" topic id/chrome', () => {
    const [other] = adaptSubjects([{ en: 'Something Else', ru: '', ka: '' }])
    expect(other.id).toBe('other')
    expect(other.icon).toBe(topicById('other').icon)
  })

  test('empty dto yields an empty list', () => {
    expect(adaptSubjects([])).toEqual([])
  })

  test('every adapted subject has every key SUPPORT_TOPICS entries have', () => {
    const [payment] = adaptSubjects(subjects)
    for (const key of Object.keys(SUPPORT_TOPICS[0])) {
      expect(payment).toHaveProperty(key)
    }
  })
})

describe('adaptTicket / adaptTicketList', () => {
  test('maps an open Ticket to the v1 active-ticket shape, matching subject to a topic via the subjects list', () => {
    const adaptedSubjects = adaptSubjects(subjects)
    const ticket = adaptTicket(tickets.results[0], adaptedSubjects)
    expect(ticket).toEqual({
      id: 101244,
      topic: 'internet',
      apt: null,
      status: 'active',
      created: '2026-07-09 14:20',
      preview: 'We have logged the issue with the ISP and will update you within 24 hours.',
      msgs: [],
    })
  })

  test('a closed_at ticket maps to status closed even if `status` itself says something else', () => {
    const ticket = adaptTicket({ ...tickets.results[1], status: 'open' })
    expect(ticket.status).toBe('closed')
  })

  test('a ticket whose subject does not exactly match any adapted subject falls back through the keyword classifier', () => {
    const ticket = adaptTicket({ subject: 'My booking reservation needs changing' }, [])
    expect(ticket.topic).toBe('booking')
  })

  test('a ticket subject matching nothing at all falls back to "other"', () => {
    const ticket = adaptTicket({ subject: 'zzz not a real topic zzz' }, [])
    expect(ticket.topic).toBe('other')
  })

  test('apt is always null — Ticket carries no flat/apartment reference field per the doc', () => {
    expect(adaptTicket(tickets.results[0]).apt).toBeNull()
  })

  test('adaptTicketList maps the {count,next,previous,results} envelope to a plain array', () => {
    const list = adaptTicketList(tickets, adaptSubjects(subjects))
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(101244)
    expect(list[1].id).toBe(101210)
    expect(list[1].status).toBe('closed')
  })

  test('adaptTicketList also accepts a bare array', () => {
    expect(adaptTicketList(tickets.results)).toHaveLength(2)
  })

  test('every adapted ticket has every key a real TICKETS mock entry has', () => {
    const ticket = adaptTicket(tickets.results[0], adaptSubjects(subjects))
    for (const key of Object.keys(TICKETS[0])) {
      expect(ticket).toHaveProperty(key)
    }
  })
})

describe('adaptTicketMessage / adaptTicketMessages', () => {
  test('reply === 0 maps to the customer\'s own message (me: true)', () => {
    const msg = adaptTicketMessage(ticketMessages[0])
    expect(msg).toEqual({
      me: true,
      date: '09.07.2026',
      time: '14:20',
      text: 'The internet in my apartment (OCT.A.30.3026) has been very slow since yesterday evening.',
      files: [],
    })
  })

  test('a nonzero reply maps to a support message (me: false) and carries authorFullname as `who`', () => {
    const msg = adaptTicketMessage(ticketMessages[1])
    expect(msg.me).toBe(false)
    expect(msg.who).toBe('ORBI Support')
    expect(msg.files).toEqual([{ id: 9, size: '1 Mb', type: 'image/png', url: 'ticket_file/9/' }])
  })

  test('adaptTicketMessages maps every message in the list, preserving order', () => {
    const msgs = adaptTicketMessages(ticketMessages)
    expect(msgs).toHaveLength(2)
    expect(msgs[0].me).toBe(true)
    expect(msgs[1].me).toBe(false)
  })

  test('a message with no files gets an empty files array, not undefined', () => {
    expect(adaptTicketMessage({ reply: 0, message: 'hi' }).files).toEqual([])
  })

  test('every adapted message has every key a real TICKETS msgs entry has', () => {
    const msg = adaptTicketMessage(ticketMessages[0])
    for (const key of Object.keys(TICKETS[1].msgs[0])) {
      expect(msg).toHaveProperty(key)
    }
  })
})

describe('adaptLockHistory', () => {
  test('groups events by calendar day (UTC) and counts them', () => {
    expect(adaptLockHistory(lockHistory)).toEqual({
      byDay: { '2026-06-01': 2, '2026-06-02': 1, '2026-06-03': 1 },
      total: 4,
    })
  })

  test('byDay is a plain object, not a Map', () => {
    const { byDay } = adaptLockHistory(lockHistory)
    expect(byDay).not.toBeInstanceOf(Map)
    expect(Object.getPrototypeOf(byDay)).toBe(Object.prototype)
  })

  test('records with an unparseable/missing timestamp are skipped entirely', () => {
    expect(adaptLockHistory([{ id: 1 }, { id: 2, created_at: 'not-a-date' }])).toEqual({ byDay: {}, total: 0 })
  })

  test('empty dto yields an empty, well-shaped result', () => {
    expect(adaptLockHistory([])).toEqual({ byDay: {}, total: 0 })
    expect(adaptLockHistory()).toEqual({ byDay: {}, total: 0 })
  })

  test('also accepts a {result: [...]} envelope', () => {
    expect(adaptLockHistory({ result: lockHistory }).total).toBe(4)
  })
})

describe('adaptTransaction / adaptTransactions', () => {
  test('maps the documented /finance/ transaction fields verbatim', () => {
    expect(adaptTransaction(financeTransactions[0])).toEqual({
      date: '2026-06-01',
      desc: 'Invoice',
      doc: 'INV-2026-0598',
      type: 'invoice',
      amount: 60,
      balance: -60,
      currency: '₾',
      reading: '00512',
    })
  })

  test('a transaction with no electricity_reading gets null, not undefined or NaN', () => {
    expect(adaptTransaction(financeTransactions[1]).reading).toBeNull()
  })

  test('adaptTransactions maps every row in the list', () => {
    expect(adaptTransactions(financeTransactions)).toHaveLength(2)
  })

  test('missing amount/balance parse to 0, not NaN', () => {
    const row = adaptTransaction({})
    expect(row.amount).toBe(0)
    expect(row.balance).toBe(0)
    expect(Number.isNaN(row.amount)).toBe(false)
  })

  test('empty dto list yields an empty result', () => {
    expect(adaptTransactions([])).toEqual([])
  })
})

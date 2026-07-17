import { describe, test, expect, afterEach, vi } from 'vitest'
import { adaptProperty, adaptFlatDetail } from './apartments'
import { adaptNewsList, adaptNewsItem } from './news'
import { adaptAgreement, adaptTariffs } from './internet'
import { adaptTicket, adaptTicketList, adaptTicketMessage, adaptTicketMessages, adaptSubjects } from './support'
import { adaptLockHistory, adaptTransaction, adaptTransactions } from './finance'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import { PLANS, BOOSTS } from '../mock/plans'
import { TICKETS, SUPPORT_TOPICS, topicById } from '../mock/tickets'
import complexes from './__fixtures__/properties.json'
import flat from './__fixtures__/flat.json'
import news from './__fixtures__/news.json'
import agreementWrapper from './__fixtures__/internettv-agreement.json'
import tariffs from './__fixtures__/internettv-tariff.json'
import tickets from './__fixtures__/tickets.json'
import ticketMessages from './__fixtures__/ticket-messages.json'
import subjects from './__fixtures__/subjects.json'
import lockHistory from './__fixtures__/lock-history.json'
import financeTransactions from './__fixtures__/finance-transactions.json'

// The fixture mirrors the live /properties/v2/ shape: COMPLEXES with a
// `flats` array. adaptProperty maps one FLAT record.
const flats = complexes[1].flats
const agreement = agreementWrapper.orbinet_agreement

describe('adaptProperty', () => {
  test('maps live flat fields into the v1 Apt shape, reading the *GEL balance', () => {
    const apt = adaptProperty(flats[0])
    expect(apt).toMatchObject({
      id: 748,
      objectId: 9910,
      project: 'Orbi City',
      code: 'OCT.A.15.1519',
      block: 'A',
      number: '1519',
      floor: 15,
      area: 30,
      epcode: '60011519',
      balance: -1677.73, // apartmentBalanceGEL, NOT the USD apartmentBalance (-637.12)
      role: 'Owner',
    })
  })

  test('maps ownership_status to Co-Owner and Trusted (doc vocabulary, unverified live)', () => {
    expect(adaptProperty({ ...flats[0], ownership_status: 'co_owner' }).role).toBe('Co-Owner')
    expect(adaptProperty({ ...flats[0], ownership_status: 'trustee' }).role).toBe('Trusted')
  })

  test('missing ownership_status falls back to apartmentCategory, then Owner', () => {
    expect(adaptProperty({ apartmentCategory: 'OWN - OWNER' }).role).toBe('Owner')
    expect(adaptProperty({ ownership_status: 'something_else' }).role).toBe('Owner')
    expect(adaptProperty({}).role).toBe('Owner')
  })

  test('non-numeric balance parses to 0, not NaN', () => {
    const apt = adaptProperty({ ...flats[0], apartmentBalanceGEL: 'n/a' })
    expect(apt.balance).toBe(0)
    expect(Number.isNaN(apt.balance)).toBe(false)
  })

  test('missing epcode falls back to the em-dash placeholder', () => {
    expect(adaptProperty({}).epcode).toBe('—')
  })

  test('synthesizes services with real GEL balances, counters and indication', () => {
    const { services } = adaptProperty(flats[0])
    expect(services.maintenance.balance).toBe(-1677.73)
    expect(services.electricity.balance).toBe(-230.73)
    expect(services.electricity.counter).toBe('35010009')
    expect(services.electricity.status).toBe('Active') // display_services includes electricity
    expect(services.water.counter).toBe('291-71519')
    expect(services.water.indication).toBe('5.00')
    // negative-when-owed, straight from InternetTVBalanceGEL — no sign flip
    expect(services.internet.balance).toBe(-95.13)
  })

  test('synthesizes services.internet from the embedded orbinet_agreement', () => {
    const { services } = adaptProperty(flats[0])
    expect(services.internet).toMatchObject({
      planId: 3, // net_tariff.id
      planName: 'Package 2',
      tariff: 70, // cost_gel
      status: 'Active', // status_name 'active'
      renewal: '26 Aug 2026', // end date
      cycleDays: 153, // 2026-03-26 .. 2026-08-26
      penalty: 6, // penalty_gel
      boost: null,
    })
    expect(services.internet.daysLeft).toBeGreaterThanOrEqual(0)
  })

  test('a flat with an empty orbinet_agreement gets the no-active-subscription shape', () => {
    const { services } = adaptProperty(flats[1])
    expect(services.internet.planId).toBeNull()
    expect(services.internet.status).toBeNull()
    expect(services.internet.tariff).toBe(0)
    expect(services.internet.balance).toBe(0)
    // display_services without electricity -> Inactive
    expect(services.electricity.status).toBe('Inactive')
  })

  test('fields with no live source get documented, render-safe fallbacks', () => {
    const { services } = adaptProperty(flats[0])
    // numeric fields piped through fmt() -> 0, never NaN/undefined
    expect(services.maintenance.tariff).toBe(0)
    // plain-text fields -> the app's '—' unknown placeholder
    expect(services.maintenance.start).toBe('—')
    expect(services.water.updated).toBe('—')
    expect(services.electricity.updated).toBe('—')
    expect(services.internet.provider).toBe('—')
  })
})

describe('adaptFlatDetail', () => {
  test('maps the live /flat/{id}/ fields into the detail-page-only fields', () => {
    expect(adaptFlatDetail(flat)).toEqual({
      id: 1,
      project: 'Orbi Plaza',
      code: 'OPZ.A.02.0205a',
      block: 'A',
      number: '5A',
      floor: 2,
      area: 30.65,
      building: 'Orbi Plaza, Block A', // synthesized — no building-name field exists
      cadastral: '05.24.03.036.01.543', // real field name: cadastre
      waterCode: '271/4a-205a',
      apCode: '—', // epcode is "" on the live sample
      role: 'Owner', // apartmentCategory "OWN - Owner" -> the part after ' - '
    })
  })

  test('unknown fields fall back to the em-dash placeholder', () => {
    const detail = adaptFlatDetail({})
    expect(detail.project).toBe('—')
    expect(detail.code).toBe('—')
    expect(detail.block).toBe('—')
    expect(detail.building).toBe('—')
    expect(detail.cadastral).toBe('—')
    expect(detail.waterCode).toBe('—')
    expect(detail.apCode).toBe('—')
    expect(detail.role).toBe('Owner')
  })
})

describe('adaptProperty + adaptFlatDetail cover every key the UI reads off an apartment', () => {
  // Every `apt.<key>` / `apartment.<key>` access across ApartmentCard,
  // ApartmentDetailPage, the 5 service accordions, and PayPage.
  const KEYS_UI_READS = [
    'id', 'project', 'code', 'block', 'number', 'floor', 'area', 'balance',
    'role', 'building', 'cadastral', 'waterCode', 'apCode', 'services',
  ]

  test('merged adapter output has every key the real mock Apt has that the UI reads', () => {
    // Same spread order endpoints/apartments.js getApartment uses: flat
    // detail first, property second — property values win on overlaps.
    const merged = { ...adaptFlatDetail(flat), ...adaptProperty(flats[0]) }
    for (const key of KEYS_UI_READS) {
      expect(merged).toHaveProperty(key)
    }
    // sanity: every one of these keys is also present on the real mock Apt
    const realApt = { ...APTS[0], services: SERVICES[APTS[0].id] }
    for (const key of KEYS_UI_READS) {
      expect(realApt).toHaveProperty(key)
    }
  })

  test('merged services object has every key each service card reads', () => {
    const merged = { ...adaptFlatDetail(flat), ...adaptProperty(flats[0]) }
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
  test('maps the paginated envelope to {items, count, next}', () => {
    const { items, count, next } = adaptNewsList(news)
    expect(count).toBe(10)
    expect(next).toBeNull()
    expect(items).toHaveLength(2)
  })

  test('maps a fully-populated trilingual article (default lang en)', () => {
    const item = adaptNewsItem(news.results[0])
    expect(item).toEqual({
      id: 1235,
      cat: 'Announcement', // no category field on the live payload — fixed fallback
      ts: 20260126,
      date: 'Jan 26, 2026',
      title: 'Guga Test Name',
      excerpt: 'Guga is testing description',
      body: '<p>Guga is testing <b>Content</b></p>',
      read: '2 min',
      seed: 1235,
      pinned: false,
      img: 'https://apimobile.orbi.ge:12443/mobileApi/news/files/f799105172c848de9ef7e934b509bad1.jpg',
    })
  })

  test('picks the *_ge variant for UI lang ka and *_ru for ru', () => {
    expect(adaptNewsItem(news.results[0], 'ka').title).toBe('გუგა ტესტ სახელი')
    expect(adaptNewsItem(news.results[0], 'ka').body).toBe('<p>გუგა ტესტავს კონტენტს</p>')
    expect(adaptNewsItem(news.results[0], 'ru').title).toBe('Гуга тестирует имя')
  })

  test('an empty localized variant falls back to English (and vice versa stays empty)', () => {
    // second fixture article: content_en is "", content_ge/_ru populated
    expect(adaptNewsItem(news.results[1], 'ka').body).toBe('<p>ქართული კონტენტი</p>')
    expect(adaptNewsItem(news.results[1], 'en').body).toBe('') // en empty, en fallback also empty
    expect(adaptNewsItem(news.results[1]).excerpt).toBe('') // all desc_* empty
  })

  test('article without a featured_image omits the optional img key', () => {
    const item = adaptNewsItem(news.results[1])
    expect(item).not.toHaveProperty('img')
    expect(item.pinned).toBe(true)
    expect(item.read).toBe('2 min')
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
  test('maps `combined` tariffs to the v1 PLANS shape plus netId/tvId', () => {
    const { plans } = adaptTariffs(tariffs)
    expect(plans).toEqual([
      { id: 100, name: 'Package 1', price: 50, mbps: 50, ch: 35, netId: 2, tvId: 8 },
      { id: 101, name: 'Package 2', price: 70, mbps: 75, ch: 35, netId: 3, tvId: 9 },
    ])
  })

  test('maps `boost` tariffs to the v1 BOOSTS shape — no duration field exists on the live payload', () => {
    const { boosts } = adaptTariffs(tariffs)
    expect(boosts).toEqual([
      { id: 6, name: 'Boost', price: 10, speed: '+65 Mbps', duration: '—' },
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
  afterEach(() => {
    vi.useRealTimers()
  })

  test('maps a live orbinet_agreement into the services.internet subscriber-state fields', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T00:00:00Z'))
    expect(adaptAgreement(agreement)).toEqual({
      provider: '—', // no provider field on the live agreement
      planId: 3, // net_tariff.id
      planName: 'Package 2',
      tariff: 70, // cost_gel
      renewal: '26 Aug 2026', // end
      daysLeft: 40, // 2026-07-17 -> 2026-08-26
      cycleDays: 153, // start..end
      boost: null, // no boost sub-object on the live agreement
      status: 'Active', // status_name 'active'
      penalty: 6, // penalty_gel
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

  test('daysLeft clamps to 0 for an already-ended agreement', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'))
    expect(adaptAgreement(agreement).daysLeft).toBe(0)
  })

  test('a paused status_name maps to Paused (assumed vocabulary — flagged in the adapter)', () => {
    expect(adaptAgreement({ ...agreement, status_name: 'paused' }).status).toBe('Paused')
  })

  test('an unrecognized status_name falls back to null rather than a fabricated value', () => {
    expect(adaptAgreement({ ...agreement, status_name: 'something_else' }).status).toBeNull()
  })

  test('every key InternetCard/ChangePackageModal/BoostModal read is present', () => {
    const KEYS_UI_READS = ['balance', 'status', 'planId', 'provider', 'tariff', 'renewal', 'daysLeft', 'cycleDays', 'boost']
    // adaptProperty already merges the agreement into services.internet
    const internet = adaptProperty(flats[0]).services.internet
    for (const key of KEYS_UI_READS) {
      expect(internet).toHaveProperty(key)
    }
    for (const key of KEYS_UI_READS) {
      expect(SERVICES.A1.internet).toHaveProperty(key)
    }
  })
})

describe('adaptSubjects', () => {
  test('maps the live {en,ru,ka} entries to SUPPORT_TOPICS-shaped topics', () => {
    const adapted = adaptSubjects(subjects)
    expect(adapted.map((s) => s.id)).toEqual(['payment', 'technical', 'booking'])
  })

  test('label defaults to English and switches with the `lang` param', () => {
    const [financial] = adaptSubjects(subjects)
    expect(financial.label).toBe('Financial Issues')
    const [financialKa] = adaptSubjects(subjects, 'ka')
    expect(financialKa.label).toBe('ფინანსური საკითხი')
  })

  test('desc/icon/tint chrome is borrowed from the matching static SUPPORT_TOPICS entry', () => {
    const [financial] = adaptSubjects(subjects)
    const staticTopic = topicById('payment')
    expect(financial.desc).toBe(staticTopic.desc)
    expect(financial.icon).toBe(staticTopic.icon)
    expect(financial.tintBg).toBe(staticTopic.tintBg)
    expect(financial.tintCol).toBe(staticTopic.tintCol)
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
    const [financial] = adaptSubjects(subjects)
    for (const key of Object.keys(SUPPORT_TOPICS[0])) {
      expect(financial).toHaveProperty(key)
    }
  })
})

describe('adaptTicket / adaptTicketList', () => {
  test('maps a live open Ticket, displaying the backend\'s localized status text', () => {
    const adaptedSubjects = adaptSubjects(subjects)
    const ticket = adaptTicket(tickets.data[0], adaptedSubjects)
    expect(ticket).toEqual({
      id: 101245,
      topic: 'technical', // subject "Technical problem" exact-matches the subjects entry
      apt: null,
      status: 'active', // closed_at is null
      statusLabel: 'New', // status.{en} — shown verbatim, not TSTATUS-mapped
      statusTone: 'pos', // no closed_at
      created: '2026-07-10 07:51',
      preview: 'ტესტ 123',
      msgs: [],
    })
  })

  test('statusLabel follows the UI language (and trims the backend\'s stray spaces)', () => {
    const ticket = adaptTicket(tickets.data[0], [], 'ru')
    expect(ticket.statusLabel).toBe('Новый') // fixture value is "Новый " with a trailing space
    expect(adaptTicket(tickets.data[0], [], 'ka').statusLabel).toBe('ახალი')
  })

  test('a closed_at ticket buckets as closed with a muted tone, whatever the status object says', () => {
    const ticket = adaptTicket(tickets.data[1], adaptSubjects(subjects))
    expect(ticket.status).toBe('closed')
    expect(ticket.statusTone).toBe('muted')
    expect(ticket.topic).toBe('booking')
  })

  test('a ticket whose subject does not exactly match any adapted subject falls back through the keyword classifier', () => {
    const ticket = adaptTicket({ subject: 'My booking reservation needs changing' }, [])
    expect(ticket.topic).toBe('booking')
  })

  test('a ticket subject matching nothing at all falls back to "other"', () => {
    const ticket = adaptTicket({ subject: 'zzz not a real topic zzz' }, [])
    expect(ticket.topic).toBe('other')
  })

  test('apt is always null — the live Ticket carries no flat/apartment reference field', () => {
    expect(adaptTicket(tickets.data[0]).apt).toBeNull()
  })

  test('adaptTicketList reads the live {limit,offset,totalTickets,data} envelope', () => {
    const list = adaptTicketList(tickets, adaptSubjects(subjects))
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(101245)
    expect(list[1].id).toBe(101210)
    expect(list[1].status).toBe('closed')
  })

  test('adaptTicketList also accepts a bare array', () => {
    expect(adaptTicketList(tickets.data)).toHaveLength(2)
  })

  test('every adapted ticket has every key a real TICKETS mock entry has', () => {
    const ticket = adaptTicket(tickets.data[0], adaptSubjects(subjects))
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

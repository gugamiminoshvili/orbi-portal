import { describe, test, expect } from 'vitest'
import { adaptProperty, adaptFlatDetail } from './apartments'
import { adaptNewsList, adaptNewsItem } from './news'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import properties from './__fixtures__/properties.json'
import flat from './__fixtures__/flat.json'
import news from './__fixtures__/news.json'

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

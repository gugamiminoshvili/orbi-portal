import { NEWS, CATS } from './news'
import { APTS, blockGrad } from './apartments'
import { SERVICES } from './services'
import { planById } from './plans'
import { TICKETS, topicById } from './tickets'
import { RATES, mockCommunals, mockContractsSummary, mockUnpaidInvoices } from './dashboard'

test('news mock shape', () => {
  expect(NEWS).toHaveLength(14)
  expect(CATS[0]).toBe('All')
  expect(NEWS[0]).toMatchObject({ id: 1, cat: 'Announcement' })
})
test('apartments enriched', () => {
  expect(APTS).toHaveLength(5)
  for (const a of APTS) {
    expect(a.apCode).toMatch(/^AP-/)
    expect(a.role).toBeTruthy()
    expect(SERVICES[a.id]).toBeDefined()
    expect(blockGrad(a)).toMatch(/^linear-gradient/)
  }
})
test('internet enrichment applied', () => {
  expect(SERVICES.A1.internet.planId).toBe('P2')
  expect(SERVICES.A1.internet.tariff).toBe(planById('P2').price)
  expect(SERVICES.A4.internet.planId).toBe(null)
})
test('tickets and topics', () => {
  expect(TICKETS.length).toBeGreaterThan(0)
  expect(topicById(TICKETS[0].topic)).toBeDefined()
})
test('dashboard rates snapshot matches the live-probed NBG values', () => {
  expect(RATES).toEqual([
    { pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 },
    { pair: 'EUR/GEL', rate: 3.0191, delta: 0.0119 },
    { pair: 'GBP/GEL', rate: 3.4923, delta: 0.0031 },
  ])
})
test('mockCommunals derives byApartment from the real mock APTS/SERVICES', () => {
  const { utilities, maintenance, byApartment } = mockCommunals()
  expect(byApartment).toHaveLength(APTS.length)
  const a1 = byApartment.find((a) => a.code === 'OCT.A.30.3026')
  expect(a1).toMatchObject({
    epcode: APTS.find((a) => a.id === 'A1').apCode,
    electricity: SERVICES.A1.electricity.balance,
    maintenance: SERVICES.A1.maintenance.balance,
  })
  expect(utilities.currency).toBe('GEL')
  // 'GEL', not the live payload's 'USD' — mock maintenance balances are the
  // GEL-denominated SERVICES numbers (see mockCommunals' comment); reporting
  // USD would make the multi-pay flow double-convert them.
  expect(maintenance.currency).toBe('GEL')
  // sums are the positive/negative split of the per-apartment balances
  expect(maintenance.debtSum).toBeLessThanOrEqual(0)
  expect(maintenance.sum).toBeGreaterThanOrEqual(0)
})
test('mockContractsSummary mirrors the live crm-less account', () => {
  expect(mockContractsSummary()).toEqual({ empty: true })
})
test('mockUnpaidInvoices lists one row per negative-balance mock service', () => {
  const { count, invoices } = mockUnpaidInvoices()
  expect(count).toBe(invoices.length)
  expect(invoices.every((inv) => inv.debtAmount > 0)).toBe(true)
  // A1 has both a negative maintenance AND electricity balance
  expect(invoices.filter((inv) => inv.flat === 'A1')).toHaveLength(2)
})

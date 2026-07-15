import { NEWS, CATS } from './news'
import { APTS, blockGrad } from './apartments'
import { SERVICES } from './services'
import { PLANS, planById } from './plans'
import { TICKETS, topicById } from './tickets'

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

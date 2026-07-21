import { listNews } from './news'
import { getApartment, changePackage, pauseInternet, resumeInternet } from './apartments'
import { payMulti, downloadInvoice } from './pay'
import { createTicket, sendMessage } from './support'
import { getCommunals, getRates, getContractsSummary, getUnpaidInvoices } from './dashboard'

test('listNews resolves items', async () => {
  const items = await listNews()
  expect(items).toHaveLength(14)
})
test('getApartment includes services', async () => {
  const a = await getApartment('A1')
  expect(a.services.maintenance.tariff).toBe(120)
})
test('changePackage mutates plan (takes the whole plan object — real mode needs its netId/tvId)', async () => {
  const net = await changePackage('A1', { id: 'P3' })
  expect(net.planId).toBe('P3')
  expect(net.tariff).toBe(110)
})
test('pause/resume roundtrip', async () => {
  const p = await pauseInternet('A1')
  expect(p.status).toBe('Paused')
  expect(p.tariff).toBe(6)
  const r = await resumeInternet('A1')
  expect(r.status).toBe('Active')
})
test('create ticket + message', async () => {
  const t = await createTicket({ topic: 'other', apt: null, text: 'hello' })
  expect(t.status).toBe('active')
  const t2 = await sendMessage(t.id, 'more')
  expect(t2.msgs.length).toBe(2)
})
test('getCommunals resolves the mock dashboard shape', async () => {
  const { utilities, maintenance, byApartment } = await getCommunals()
  expect(utilities.currency).toBe('GEL')
  // mock maintenance is GEL-native (see mockCommunals' currency comment) —
  // live mode reports 'USD' and the multi-pay flow converts conditionally.
  expect(maintenance.currency).toBe('GEL')
  expect(byApartment.length).toBeGreaterThan(0)
})
test('getRates resolves the static mock NBG snapshot', async () => {
  const { rates, source } = await getRates()
  expect(source).toBe('NBG')
  expect(rates.map((r) => r.pair)).toEqual(['USD/GEL', 'EUR/GEL'])
})
test('getContractsSummary resolves the mock crm-less zero-state', async () => {
  expect(await getContractsSummary()).toEqual({ empty: true })
})
test('getUnpaidInvoices resolves a count + list derived from mock services', async () => {
  const { count, invoices } = await getUnpaidInvoices()
  expect(count).toBe(invoices.length)
  expect(count).toBeGreaterThan(0)
})
test('payMulti (mock) returns a fake redirect url regardless of method', async () => {
  const res = await payMulti({ services: [{ epcode: '60011519', amount: 100, serviceType: 'apartment' }], method: 'card' })
  expect(res).toEqual({ url: 'https://example.test/pay' })
})
test('downloadInvoice (mock) resolves a placeholder Blob', async () => {
  const blob = await downloadInvoice(19365)
  expect(blob).toBeInstanceOf(Blob)
  expect(blob.type).toBe('application/pdf')
})

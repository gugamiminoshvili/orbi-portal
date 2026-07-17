import { listNews, getNews } from './news'
import { listApartments, getApartment, changePackage, pauseInternet, resumeInternet } from './apartments'
import { payService } from './pay'
import { listTickets, createTicket, sendMessage } from './support'

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
test('payService returns ref and clears balance', async () => {
  const res = await payService('A1', { amount: 180, method: 'card' })
  expect(res.ref).toMatch(/^PAY-/)
  const a = await getApartment('A1')
  expect(a.balance).toBe(0)
})
test('create ticket + message', async () => {
  const t = await createTicket({ topic: 'other', apt: null, text: 'hello' })
  expect(t.status).toBe('active')
  const t2 = await sendMessage(t.id, 'more')
  expect(t2.msgs.length).toBe(2)
})

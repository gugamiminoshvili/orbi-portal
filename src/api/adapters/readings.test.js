import { test, expect } from 'vitest'
import { adaptDailyReadings } from './readings'
import { adaptPaymentMethods } from './paymentMethods'

test('daily readings: renamed, oldest first, bad dates dropped', () => {
  expect(adaptDailyReadings([
    { date: '2026-10-28', meter_reading: 1250.5, consumption: 4.2 },
    { date: '2026-10-27T00:00:00', meter_reading: '1246.3', consumption: '3.9' },
    { date: null, meter_reading: 1, consumption: 1 },
  ])).toEqual([
    { date: '2026-10-27', reading: 1246.3, use: 3.9 },
    { date: '2026-10-28', reading: 1250.5, use: 4.2 },
  ])
  expect(adaptDailyReadings(null)).toEqual([])
})

test('payment methods: renamed; a missing limit or fee stays null, not 0', () => {
  expect(adaptPaymentMethods([
    { id: 1, name: 'Card', key: 'card', title: 'Pay by card', max_payable: 5000.0, fee_percent: 1.5, max_fee_amount: 50.0 },
    { id: 6, name: 'Invoice', key: 'INVOICE', title: 'Invoice', max_payable: null, fee_percent: null },
    { name: 'no id' },
  ])).toEqual([
    { id: 1, key: 'card', name: 'Card', title: 'Pay by card', max: 5000, feePct: 1.5, maxFee: 50 },
    { id: 6, key: 'invoice', name: 'Invoice', title: 'Invoice', max: null, feePct: null, maxFee: null },
  ])
})

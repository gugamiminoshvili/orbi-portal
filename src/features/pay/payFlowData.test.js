import { describe, test, expect } from 'vitest'
import { owedFor, buildRows, buildComplexes, utilityCardData, round2, serviceTypeFor } from './payFlowData'

const USD_RATE = 2.5

// Two apartments in "Alpha", one in "Beta" — see payFlowData.js's header
// comment for the owed = -balance sign flip this all depends on.
const ROW1 = {
  code: 'C1',
  epcode: 'EP1',
  electricity: -50, // owed 50
  // internettv owes balanceWithPenalty (base -18 plus penalty 2 -> -20)
  internet: { balance: -18, balanceWithPenalty: -20, cost: 10, penalty: 2 }, // owed 20
  maintenance: -100, // USD, owed 100 USD -> 250 GEL at 2.5
}
const ROW2 = {
  code: 'C2',
  epcode: 'EP2',
  electricity: 30, // credit
  internet: { balance: 5, balanceWithPenalty: 5, cost: 10, penalty: 0 }, // credit
  maintenance: 0, // zero
}
const ROW3 = {
  code: 'C3',
  epcode: 'EP3',
  electricity: -10, // owed 10
  internet: { balance: 0, balanceWithPenalty: 0, cost: 5, penalty: 0 }, // zero
  maintenance: -5, // USD, owed 5 USD -> 12.5 GEL
}

const APARTMENTS = [
  { id: 1, code: 'C1', project: 'Alpha', role: 'Owner' },
  { id: 2, code: 'C2', project: 'Alpha', role: 'Owner' },
  { id: 3, code: 'C3', project: 'Beta', role: 'Trusted' },
]

describe('owedFor', () => {
  test('electricity/internettv are read straight off (already GEL, sign-flipped)', () => {
    expect(owedFor(ROW1, 'electricity', USD_RATE)).toBe(50)
    expect(owedFor(ROW2, 'electricity', USD_RATE)).toBe(-30)
    expect(owedFor(ROW1, 'internettv', USD_RATE)).toBe(20)
    expect(owedFor(ROW2, 'internettv', USD_RATE)).toBe(-5)
  })

  test('internettv charges balanceWithPenalty (penalty-inclusive), not the base balance', () => {
    // ROW1: base balance -18, with penalty -20 — the collectable amount wins
    expect(owedFor(ROW1, 'internettv', USD_RATE)).toBe(20)
    // rows shaped before the field existed fall back to the plain balance
    const legacyRow = { ...ROW1, internet: { balance: -18, cost: 10, penalty: 0 } }
    expect(owedFor(legacyRow, 'internettv', USD_RATE)).toBe(18)
  })

  test("maintenance converts USD->GEL via the rate when the currency is 'USD' (default)", () => {
    expect(owedFor(ROW1, 'maintenance', USD_RATE)).toBe(250)
    expect(owedFor(ROW3, 'maintenance', USD_RATE)).toBe(12.5)
    expect(owedFor(ROW1, 'maintenance', USD_RATE, 'USD')).toBe(250)
  })

  test("maintenance is NOT converted when the currency is already 'GEL' (mock mode)", () => {
    // The double-conversion regression: mock maintenance balances are
    // GEL-native, so the flow's owed amount must equal the detail page's
    // -balance verbatim — no rate multiply.
    expect(owedFor(ROW1, 'maintenance', USD_RATE, 'GEL')).toBe(100)
    expect(owedFor(ROW3, 'maintenance', USD_RATE, 'GEL')).toBe(5)
  })

  test('USD maintenance falls back to raw magnitude when no rate is available', () => {
    expect(owedFor(ROW1, 'maintenance', null)).toBe(100)
  })

  test('zero balance is treated as non-owed (owed <= 0)', () => {
    // -0 rather than 0 (owed = -balance, balance is 0) — fine, -0 < 0 is
    // false in JS so the "owed > 0" selectable check still treats it as
    // non-owed; toBeCloseTo sidesteps the Object.is(-0, 0) mismatch.
    expect(owedFor(ROW2, 'maintenance', USD_RATE)).toBeCloseTo(0)
  })
})

describe('buildRows', () => {
  test('joins project/role from the matching apartment by code', () => {
    const rows = buildRows([ROW1, ROW2, ROW3], APARTMENTS)
    expect(rows.find((r) => r.code === 'C1')).toMatchObject({ project: 'Alpha', role: 'Owner', aptId: 1 })
    expect(rows.find((r) => r.code === 'C3')).toMatchObject({ project: 'Beta', role: 'Trusted', aptId: 3 })
  })

  test('an unmatched code gets a placeholder project rather than being dropped', () => {
    const rows = buildRows([{ ...ROW1, code: 'UNKNOWN' }], APARTMENTS)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ project: '-', role: null, aptId: null })
  })
})

describe('buildComplexes', () => {
  test('groups by project and sums unpaid bills / outstanding GEL across all 3 utilities', () => {
    const rows = buildRows([ROW1, ROW2, ROW3], APARTMENTS)
    const complexes = buildComplexes(rows, USD_RATE)

    const alpha = complexes.find((c) => c.project === 'Alpha')
    expect(alpha.count).toBe(2)
    // row1: elec 50 + internet 20 + maintenance 250 = 3 owed bills
    // row2: all credit/zero = 0 owed bills
    expect(alpha.unpaidBillsCount).toBe(3)
    expect(alpha.outstandingGEL).toBeCloseTo(320)

    const beta = complexes.find((c) => c.project === 'Beta')
    expect(beta.count).toBe(1)
    // row3: elec 10 (owed) + internet 0 (not owed) + maintenance 12.5 (owed) = 2
    expect(beta.unpaidBillsCount).toBe(2)
    expect(beta.outstandingGEL).toBeCloseTo(22.5)
  })

  test("passes maintenanceCurrency through — GEL-native maintenance isn't rate-multiplied", () => {
    const rows = buildRows([ROW1], APARTMENTS)
    const alpha = buildComplexes(rows, USD_RATE, 'GEL').find((c) => c.project === 'Alpha')
    // elec 50 + internet 20 + maintenance 100 (NOT 250) = 170
    expect(alpha.outstandingGEL).toBeCloseTo(170)
  })
})

describe('utilityCardData', () => {
  test('counts apartments owing per utility, within one complex', () => {
    const rows = buildRows([ROW1, ROW2], APARTMENTS)
    const alpha = buildComplexes(rows, USD_RATE).find((c) => c.project === 'Alpha')
    const cards = utilityCardData(alpha.apartments, USD_RATE)

    expect(cards).toEqual([
      { utility: 'maintenance', unpaidCount: 1 },
      { utility: 'electricity', unpaidCount: 1 },
      { utility: 'internettv', unpaidCount: 1 },
    ])
  })
})

describe('round2', () => {
  test('rounds to cents', () => {
    expect(round2(12.3456)).toBe(12.35)
    expect(round2(250)).toBe(250)
  })
})

describe('serviceTypeFor', () => {
  test('maintenance maps to the finance accountType enum\'s "apartment"', () => {
    expect(serviceTypeFor('maintenance')).toBe('apartment')
  })
  test('electricity/internettv pass through unchanged (already match the enum)', () => {
    expect(serviceTypeFor('electricity')).toBe('electricity')
    expect(serviceTypeFor('internettv')).toBe('internettv')
  })
})

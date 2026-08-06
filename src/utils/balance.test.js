import { describe, expect, test } from 'vitest'
import { amountOwed, balanceTone, inAdvance, owes } from './balance'

// Owner ruling 2026-08-06: positive = owed, negative = paid ahead. These
// tests are the executable statement of that convention — if it ever flips
// again, this file should be the first thing to fail.

describe('owes / inAdvance', () => {
  test('a positive balance is a debt', () => {
    expect(owes(120)).toBe(true)
    expect(inAdvance(120)).toBe(false)
  })

  test('a negative balance is an advance, not a debt', () => {
    expect(owes(-40)).toBe(false)
    expect(inAdvance(-40)).toBe(true)
  })

  test('zero is neither', () => {
    expect(owes(0)).toBe(false)
    expect(inAdvance(0)).toBe(false)
  })

  test('a missing or unparseable balance is treated as settled, never as a debt', () => {
    // Balances reach these helpers straight from adapters that coerce bad
    // input to 0; guard anyway, since inventing a debt is the worse failure.
    for (const value of [undefined, null, '', 'n/a', NaN]) {
      expect(owes(value)).toBe(false)
      expect(amountOwed(value)).toBe(0)
    }
  })

  test('numeric strings are honoured (doc examples send balances as strings)', () => {
    expect(owes('95.50')).toBe(true)
    expect(amountOwed('95.50')).toBe(95.5)
    expect(owes('-95.50')).toBe(false)
  })
})

describe('amountOwed', () => {
  test('is the balance when owed', () => {
    expect(amountOwed(120)).toBe(120)
  })

  test('is never negative — an advance cannot be "paid"', () => {
    expect(amountOwed(-40)).toBe(0)
    expect(amountOwed(0)).toBe(0)
  })
})

describe('balanceTone', () => {
  test('red for a debt, green for settled or in advance', () => {
    expect(balanceTone(120)).toBe('neg')
    expect(balanceTone(0)).toBe('pos')
    expect(balanceTone(-40)).toBe('pos')
  })
})

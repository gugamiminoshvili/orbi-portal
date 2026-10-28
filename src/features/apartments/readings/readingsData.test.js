import { describe, test, expect } from 'vitest'
import {
  VISIBLE_DAYS, axisLabel, dayLabel, fmtReading, groupByMonth, monthFull, readingsCsv, visibleWindow, yMaxFor,
} from './readingsData'
import { mockDailyReadings } from '../../../api/mock/readings'

const days = [
  { date: '2026-08-30', reading: 100, use: 4 },
  { date: '2026-08-31', reading: 106, use: 6 },
  { date: '2026-09-01', reading: 113, use: 7 },
  { date: '2026-09-02', reading: 125, use: 12 },
]

describe('groupByMonth', () => {
  test('splits by calendar month with index ranges and totals, oldest first', () => {
    expect(groupByMonth(days)).toEqual([
      { key: 2026 * 12 + 7, y: 2026, m: 7, start: 0, end: 1, total: 10 },
      { key: 2026 * 12 + 8, y: 2026, m: 8, start: 2, end: 3, total: 19 },
    ])
  })
})

describe('yMaxFor', () => {
  test('rounds the largest day up to a multiple of 5, never below 5', () => {
    expect(yMaxFor(days)).toBe(15)
    expect(yMaxFor([{ date: '2026-01-01', reading: 1, use: 0 }])).toBe(5)
  })
})

describe('visibleWindow', () => {
  test('30 days on screen; the middle day decides the current month', () => {
    const slot = 10
    expect(visibleWindow(0, slot * VISIBLE_DAYS, slot, 365)).toEqual({ first: 0, last: 29, mid: 15 })
    expect(visibleWindow(335 * slot, slot * VISIBLE_DAYS, slot, 365)).toEqual({ first: 335, last: 364, mid: 350 })
  })
  test('without a measured width it falls back to the newest day', () => {
    expect(visibleWindow(0, 0, 0, 10)).toEqual({ first: 0, last: 9, mid: 9 })
  })
})

describe('axisLabel', () => {
  test('the 1st shows the month name; the newest day always shows its number', () => {
    expect(axisLabel('2026-09-01', false, 30, 'en')).toEqual({ text: 'Sep', month: true })
    expect(axisLabel('2026-09-01', false, 30, 'ka')).toEqual({ text: 'სექ', month: true })
    expect(axisLabel('2026-09-29', true, 8, 'en').text).toBe('29')
  })
  test('numbers thin out as slots narrow, and stay clear of the next month', () => {
    expect(axisLabel('2026-09-07', false, 30, 'en').text).toBe('7')   // every day
    expect(axisLabel('2026-09-07', false, 14, 'en').text).toBe('')    // every 3rd
    expect(axisLabel('2026-09-09', false, 14, 'en').text).toBe('9')
    expect(axisLabel('2026-09-10', false, 9, 'en').text).toBe('10')   // every 5th
    expect(axisLabel('2026-09-30', false, 9, 'en').text).toBe('')     // would crowd "Oct"
    expect(axisLabel('2026-08-30', false, 9, 'en').text).toBe('')     // 31-day month too
  })
})

describe('formatting', () => {
  test('day labels, month names and meter readings', () => {
    expect(dayLabel('2026-09-30', 'en')).toBe('30 Sep 2026')
    expect(dayLabel('2026-09-30', 'ru')).toBe('30 сен 2026')
    expect(monthFull(8, 'ka')).toBe('სექტემბერი')
    expect(fmtReading(13020)).toBe('13 020')
  })
  test('CSV export, oldest first', () => {
    expect(readingsCsv(days.slice(0, 2))).toBe('date,reading,consumption_kwh\n2026-08-30,100,4\n2026-08-31,106,6')
  })
})

describe('mockDailyReadings', () => {
  test('twelve months ending today, readings rising by each day\'s use', () => {
    const y = mockDailyReadings('A1', new Date(2026, 8, 30))
    expect(y[y.length - 1].date).toBe('2026-09-30')
    expect(y[0].date).toBe('2025-10-01')
    expect(y).toHaveLength(365)
    for (let i = 1; i < y.length; i++) expect(y[i].reading - y[i - 1].reading).toBe(y[i].use)
  })
})

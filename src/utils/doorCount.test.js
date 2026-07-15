import { doorCount, monthTotal, yearTotal } from './doorCount'

test('doorCount deterministic and non-negative', () => {
  expect(doorCount('A1', 2026, 5, 10)).toBe(doorCount('A1', 2026, 5, 10))
  for (let d = 1; d <= 28; d++) expect(doorCount('A1', 2026, 5, d)).toBeGreaterThanOrEqual(0)
})
test('monthTotal sums days', () => {
  let t = 0
  for (let d = 1; d <= 30; d++) t += doorCount('A1', 2026, 5, d) // June 2026 = 30 days
  expect(monthTotal('A1', 2026, 5)).toBe(t)
})
test('yearTotal sums months', () => {
  let t = 0
  for (let m = 0; m < 12; m++) t += monthTotal('A1', 2026, m)
  expect(yearTotal('A1', 2026)).toBe(t)
})

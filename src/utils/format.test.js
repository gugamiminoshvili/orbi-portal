import { fmt, fmtNum, fmtDate, symbolFor } from './format'

test('formats positive amounts with currency and thousands', () => {
  expect(fmt(1450)).toBe('1,450.00\u00a0₾')
})
test('formats negatives with leading minus', () => {
  expect(fmt(-180)).toBe('-180.00\u00a0₾')
})
test('accepts custom currency', () => {
  expect(fmt(10, '$')).toBe('10.00\u00a0$')
})
test('fmtNum drops the symbol but keeps grouping, 2 decimals and the minus', () => {
  expect(fmtNum(2034.789)).toBe('2,034.79')
  expect(fmtNum(0)).toBe('0.00')
  expect(fmtNum(-180)).toBe('-180.00')
})
test('symbolFor maps ISO codes, falls back, and passes unknown codes through', () => {
  expect(symbolFor('USD')).toBe('$')
  expect(symbolFor('GEL')).toBe('₾')
  expect(symbolFor(undefined, '$')).toBe('$')
  expect(symbolFor('JPY')).toBe('JPY')
})
test('fmtDate keeps the date part only, as DD/MM/YYYY', () => {
  expect(fmtDate('2015-04-16T00:00:00')).toBe('16/04/2015')
  expect(fmtDate('2015-04-16')).toBe('16/04/2015')
})
test('fmtDate passes through anything that is not a leading ISO date', () => {
  expect(fmtDate('')).toBe('')
  expect(fmtDate(undefined)).toBeUndefined()
  expect(fmtDate('16 Apr 2015')).toBe('16 Apr 2015')
})

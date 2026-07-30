import { fmt, fmtNum } from './format'

test('formats positive amounts with currency and thousands', () => {
  expect(fmt(1450)).toBe('₾1,450.00')
})
test('formats negatives with leading minus', () => {
  expect(fmt(-180)).toBe('-₾180.00')
})
test('accepts custom currency', () => {
  expect(fmt(10, '$')).toBe('$10.00')
})
test('fmtNum drops the symbol but keeps grouping, 2 decimals and the minus', () => {
  expect(fmtNum(2034.789)).toBe('2,034.79')
  expect(fmtNum(0)).toBe('0.00')
  expect(fmtNum(-180)).toBe('-180.00')
})

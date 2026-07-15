import { fmt } from './format'

test('formats positive amounts with currency and thousands', () => {
  expect(fmt(1450)).toBe('₾1,450.00')
})
test('formats negatives with leading minus', () => {
  expect(fmt(-180)).toBe('-₾180.00')
})
test('accepts custom currency', () => {
  expect(fmt(10, '$')).toBe('$10.00')
})

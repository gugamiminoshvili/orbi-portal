import { applyNewsQuery } from './useNewsList'
import { NEWS } from '../../api/mock/news'

test('filters by category', () => {
  const { pageItems, total } = applyNewsQuery(NEWS, { cat: 'Financial' })
  expect(total).toBe(3)
  expect(pageItems.every(n => n.cat === 'Financial')).toBe(true)
})
test('search matches title or excerpt, case-insensitive', () => {
  const { total } = applyNewsQuery(NEWS, { q: 'ELEVATOR' })
  expect(total).toBe(1)
})
test('sort + pagination', () => {
  const p1 = applyNewsQuery(NEWS, { sort: 'new', page: 1 })
  expect(p1.pageItems).toHaveLength(9)
  expect(p1.pages).toBe(2)
  expect(p1.pageItems[0].id).toBe(1) // ts 20260606 newest
  const old = applyNewsQuery(NEWS, { sort: 'old', page: 1 })
  expect(old.pageItems[0].id).toBe(14)
})
test('page out of range clamps to last page', () => {
  const { pageItems, pages } = applyNewsQuery(NEWS, { page: 99 })
  expect(pageItems).toHaveLength(5) // 14 items, 9/page -> page 2 has 5
  expect(pages).toBe(2)
})
test('no results returns empty pageItems and 1 page', () => {
  const { pageItems, pages, total } = applyNewsQuery(NEWS, { q: 'zzz-no-match' })
  expect(pageItems).toHaveLength(0)
  expect(pages).toBe(1)
  expect(total).toBe(0)
})

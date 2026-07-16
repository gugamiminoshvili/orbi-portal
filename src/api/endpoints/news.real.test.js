// Real-branch tests for src/api/endpoints/news.js. The whole client module is
// mocked so USE_MOCK reads false and http() is a spy we assert calls against
// — the standard pattern used by every `*.real.test.js` file in this
// directory (documented once here; see also apartments.real.test.js and
// support.real.test.js).
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

import { http } from '../client'
import { listNews, getNews } from './news'
import newsListFixture from '../adapters/__fixtures__/news.json'

beforeEach(() => {
  http.mockReset()
})

describe('listNews (real branch)', () => {
  test('GET /mobileApi/news/ with no params when called with no args', async () => {
    http.mockResolvedValueOnce(newsListFixture)
    const result = await listNews()
    expect(http).toHaveBeenCalledWith('/mobileApi/news/')
    expect(result.count).toBe(14)
    expect(result.items).toHaveLength(3)
    expect(result.items[0]).toMatchObject({ id: 101, title: newsListFixture.results[0].title, cat: 'Announcement' })
  })

  test('passes page and search as query params', async () => {
    http.mockResolvedValueOnce(newsListFixture)
    await listNews({ page: 2, search: 'elevator' })
    expect(http).toHaveBeenCalledWith('/mobileApi/news/?page=2&search=elevator')
  })

  test('omits page=1 (the default) from the query string', async () => {
    http.mockResolvedValueOnce(newsListFixture)
    await listNews({ page: 1, search: 'x' })
    expect(http).toHaveBeenCalledWith('/mobileApi/news/?search=x')
  })
})

describe('getNews (real branch)', () => {
  test('GET /mobileApi/news/{id}/ and adapts the single article', async () => {
    http.mockResolvedValueOnce(newsListFixture.results[1])
    const item = await getNews(102)
    expect(http).toHaveBeenCalledWith('/mobileApi/news/102/')
    expect(item).toMatchObject({ id: 102, cat: 'Maintenance' })
  })
})

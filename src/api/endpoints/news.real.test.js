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
import i18n from '../../i18n'
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
    expect(result.count).toBe(10)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({ id: 1235, title: 'Guga Test Name' })
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

  test('adapts with the current UI language (trilingual name_/desc_/content_ fields)', async () => {
    const original = i18n.language
    try {
      await i18n.changeLanguage('ru')
      http.mockResolvedValueOnce(newsListFixture)
      const result = await listNews()
      expect(result.items[0].title).toBe('Гуга тестирует имя')
    } finally {
      await i18n.changeLanguage(original)
    }
  })
})

describe('getNews (real branch)', () => {
  test('GET /mobileApi/news/{id}/ and adapts the single trilingual article', async () => {
    http.mockResolvedValueOnce(newsListFixture.results[0])
    const item = await getNews(1235)
    expect(http).toHaveBeenCalledWith('/mobileApi/news/1235/')
    expect(item).toMatchObject({
      id: 1235,
      title: 'Guga Test Name',
      body: '<p>Guga is testing <b>Content</b></p>',
      img: newsListFixture.results[0].featured_image,
    })
  })
})

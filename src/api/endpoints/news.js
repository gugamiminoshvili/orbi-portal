import { USE_MOCK, delay, http } from '../client'
import { NEWS } from '../mock/news'
import { adaptNewsItem, adaptNewsList } from '../adapters/news'

// Mock branch is untouched (byte-identical to pre-I6): ignores {page,search}
// entirely and always resolves the full NEWS array — NewsListPage does its
// own client-side filter/sort/paginate over that (useNewsList.js). The real
// branch instead delegates paging/search to the server (docs/api-reference.md
// GET /mobileApi/news/?search=&page=, page size 10) and returns the adapted
// `{items,count,next}` shape (adapters/news.js's adaptNewsList) so the caller
// can drive a server-side pager instead.
export async function listNews({ page = 1, search = '' } = {}) {
  if (USE_MOCK) {
    await delay()
    return NEWS
  }
  const params = new URLSearchParams()
  if (page && page !== 1) params.set('page', String(page))
  if (search) params.set('search', search)
  const qs = params.toString()
  const dto = await http(`/mobileApi/news/${qs ? `?${qs}` : ''}`)
  return adaptNewsList(dto)
}

export async function getNews(id) {
  if (USE_MOCK) {
    await delay()
    return NEWS.find((n) => n.id === id)
  }
  const dto = await http(`/mobileApi/news/${id}/`)
  return adaptNewsItem(dto)
}

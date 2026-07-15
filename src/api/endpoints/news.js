import { USE_MOCK, delay, http } from '../client'
import { NEWS } from '../mock/news'

export async function listNews() {
  if (USE_MOCK) {
    await delay()
    return NEWS
  }
  return http('/news')
}

export async function getNews(id) {
  if (USE_MOCK) {
    await delay()
    return NEWS.find((n) => n.id === id)
  }
  return http(`/news/${id}`)
}

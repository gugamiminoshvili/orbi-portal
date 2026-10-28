// Electricity daily readings for one flat: `[{ date: 'YYYY-MM-DD', reading,
// use }]`, oldest first - see features/apartments/readings/readingsData.js.
import { USE_MOCK, delay } from '../client'
import { mockDailyReadings } from '../mock/readings'

// FLAG: the live endpoint is not connected yet - the backend contract is
// still to come. Until it is, real mode rejects, and DailyReadingsModal shows
// its error state rather than an empty year that would look like no usage.
export async function getDailyReadings(flatId) {
  if (USE_MOCK) {
    await delay()
    return mockDailyReadings(flatId)
  }
  throw new Error('Daily readings endpoint is not connected yet')
}

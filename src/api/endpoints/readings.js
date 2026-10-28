// Electricity daily readings for one flat: `[{ date: 'YYYY-MM-DD', reading,
// use }]`, oldest first - see features/apartments/readings/readingsData.js.
import { USE_MOCK, delay, http, persCab } from '../client'
import { mockDailyReadings } from '../mock/readings'
import { adaptDailyReadings } from '../adapters/readings'

// GET /persCabApi/electricity_daily/?flatId= (persCabApi host, see client.js).
export async function getDailyReadings(flatId) {
  if (USE_MOCK) {
    await delay()
    return mockDailyReadings(flatId)
  }
  const params = new URLSearchParams({ flatId: String(flatId) })
  const rows = await http(persCab(`/electricity_daily/?${params.toString()}`))
  return adaptDailyReadings(rows)
}

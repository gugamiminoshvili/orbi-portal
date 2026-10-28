// GET /persCabApi/electricity_daily/?flatId= -> the readings view's day shape.
//   live: { date: '2026-10-28', meter_reading: 1250.5, consumption: 4.2 }
//   app:  { date: '2026-10-28', reading: 1250.5, use: 4.2 }
// Oldest first, whatever order the backend sends; rows without a usable date
// are dropped rather than drawn at a wrong place on the chart.
export function adaptDailyReadings(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r) => ({
      date: typeof r?.date === 'string' ? r.date.slice(0, 10) : '',
      reading: Number(r?.meter_reading) || 0,
      use: Number(r?.consumption) || 0,
    }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

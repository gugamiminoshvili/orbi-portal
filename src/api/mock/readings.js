// Mock electricity daily readings: twelve whole months ending today. A
// seasonal base (winter and high summer higher), a gentle wave and an
// occasional heavier day, seeded by the flat so each apartment's year is
// stable across reloads. Shape matches getDailyReadings():
// `[{ date: 'YYYY-MM-DD', reading, use }]`, oldest first.
const SEASON = [12, 11, 9, 7, 6, 8, 11, 12, 9, 8, 9, 11] // Jan..Dec kWh/day

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function mockDailyReadings(seedKey = 'A1', today = new Date()) {
  const seed = String(seedKey).split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1)
  const days = []
  let reading = 9000 + (seed % 50) * 80
  for (let d = new Date(start), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) {
    const wave = 2.5 * Math.sin((i + seed) / 1.7) + 1.5 * Math.cos((i + seed) / 3.3)
    const use = Math.max(3, Math.round(SEASON[d.getMonth()] + wave + ((i + seed) % 11 === 5 ? 3 : 0)))
    reading += use
    days.push({ date: iso(d), reading, use })
  }
  return days
}

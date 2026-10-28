// Pure helpers for the electricity daily-readings view (DailyReadingsModal).
// React-free so the month grouping, axis labelling and visible-window maths
// can be unit tested without a layout engine (see readingsData.test.js).
//
// A reading day is `{ date: 'YYYY-MM-DD', reading: number, use: number }`,
// oldest first - `reading` is the meter value at the end of the day, `use`
// the kWh consumed that day.

// The chart always shows this many days across its full width; the rest of
// the year is reached by scrolling it sideways.
export const VISIBLE_DAYS = 30

// Month names are written out per language rather than taken from Intl:
// browsers ship Georgian month names unevenly (Chrome falls back to English).
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
}
const MONTHS_FULL = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}
const pick = (table, lang) => table[lang] || table.en

export function monthShort(m, lang) {
  return pick(MONTHS_SHORT, lang)[m]
}
export function monthFull(m, lang) {
  return pick(MONTHS_FULL, lang)[m]
}

// 'YYYY-MM-DD' -> { y, m (0-11), d }. Read off the string, not through Date,
// so a UTC-vs-local parse can never move the day.
export function splitDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

// "30 Sep 2026" in the active language.
export function dayLabel(iso, lang) {
  const { y, m, d } = splitDay(iso)
  return `${d} ${monthShort(m, lang)} ${y}`
}

// Meter readings are grouped with a thin gap: 13 020.
export function fmtReading(n) {
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')
}

export const monthKey = (iso) => {
  const { y, m } = splitDay(iso)
  return y * 12 + m
}

// Oldest first: `{ key, y, m, start, end, total }`, where start/end are the
// indexes of the month's first and last day in `days`.
export function groupByMonth(days) {
  const out = []
  days.forEach((day, i) => {
    const key = monthKey(day.date)
    let g = out[out.length - 1]
    if (!g || g.key !== key) {
      const { y, m } = splitDay(day.date)
      g = { key, y, m, start: i, end: i, total: 0 }
      out.push(g)
    }
    g.end = i
    g.total += day.use
  })
  return out
}

// Top of the y-axis: the year's largest day, rounded up to a multiple of 5
// so the ticks land on whole numbers.
export function yMaxFor(days) {
  const max = days.reduce((a, d) => Math.max(a, d.use), 0)
  return Math.max(5, Math.ceil(max / 5) * 5)
}

// Which days are on screen for a scroll position. `mid` decides the month
// shown as current - the one under the middle of the chart.
export function visibleWindow(scrollLeft, clientWidth, slot, count) {
  if (!slot || !count) return { first: 0, last: Math.max(0, count - 1), mid: Math.max(0, count - 1) }
  const first = Math.max(0, Math.min(count - 1, Math.round(scrollLeft / slot)))
  const last = Math.min(count - 1, first + VISIBLE_DAYS - 1)
  const mid = Math.max(0, Math.min(count - 1, Math.floor((scrollLeft + clientWidth / 2) / slot)))
  return { first, last, mid }
}

// What the x-axis prints under a day:
//   - the 1st of a month: the month's short name, so the boundary is labelled;
//   - the newest day: always its number;
//   - otherwise every day, every 3rd or every 5th as the slots narrow, and
//     never a number so close to the month's end that it crowds the next name.
export function axisLabel(iso, isLast, slot, lang) {
  const { y, m, d } = splitDay(iso)
  if (d === 1) return { text: monthShort(m, lang), month: true }
  if (isLast) return { text: String(d), month: false }
  const every = slot >= 24 ? 1 : slot >= 12 ? 3 : 5
  const dim = new Date(y, m + 1, 0).getDate()
  const show = every === 1 || (d % every === 0 && dim - d >= every - 1)
  return { text: show ? String(d) : '', month: false }
}

// The export: one row per day, oldest first.
export function readingsCsv(days) {
  return ['date,reading,consumption_kwh', ...days.map((d) => `${d.date},${d.reading},${d.use}`)].join('\n')
}

// DTO adapters for `/mobileApi/lockHistory/` and `/mobileApi/finance/`
// (docs/api-reference.md "Properties, content, and complexes" /
// "Dashboard, documents, finance, and payment").

function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

// "YYYY-MM-DD" from an ISO timestamp, in UTC (pinned the same way
// adapters/news.js's tsFromDate/formatDate are, so grouping doesn't shift
// across CI/local timezones).
function dayKey(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// `/lockHistory/`'s doc says only `{"...":"LockHistorySerializer fields"}` —
// completely elided. The doors calendar (DoorsCalendarModal/doorCount.js)
// currently runs on a deterministic mock generator, not a per-event list, so
// there's no existing mock shape to match field names against either. The
// names read below (apartmentId/created_at/method/success) are an invented
// guess at a per-door-open-event record — see
// __fixtures__/lock-history.json — FLAG for live verification.
//
// Every record with a parseable timestamp counts once, on its own calendar
// day, regardless of `method`/`success` — the doc gives no signal that a
// failed attempt is excluded from "openings", so this counts all of them
// rather than guessing at a filter. Records with an unparseable/missing
// timestamp are skipped entirely (not counted anywhere), since they can't
// be placed on the calendar.
export function adaptLockHistory(dto = []) {
  const list = Array.isArray(dto) ? dto : dto.result || []
  const byDay = {}
  let total = 0
  for (const rec of list) {
    const key = dayKey(rec.created_at)
    if (!key) continue
    byDay[key] = (byDay[key] || 0) + 1
    total += 1
  }
  return { byDay, total }
}

// `/finance/`'s transaction-item fields ARE enumerated by the doc:
// `{accountType,apartmentName,apartmentId,service,event,docNo,docDate,
// docType,currency,currencySymbol,amount,balance,electricity_reading}` —
// read verbatim below (see __fixtures__/finance-transactions.json). No v1
// UI consumes this yet (the electricity/reports UI still reads the static
// REPORTS mock in src/api/mock/finance.js) — this is scaffolding for that
// future report table, kept intentionally minimal per the brief.
export function adaptTransaction(dto = {}) {
  return {
    date: dto.docDate ?? '-',
    desc: dto.event || dto.service || '-',
    doc: dto.docNo ?? '-',
    type: dto.docType ?? '-',
    amount: num(dto.amount),
    balance: num(dto.balance),
    currency: dto.currencySymbol || dto.currency || '-',
    reading: dto.electricity_reading ?? null,
  }
}

export function adaptTransactions(dto = []) {
  const list = Array.isArray(dto) ? dto : dto.result || []
  return list.map(adaptTransaction)
}

// DTO adapter for `/mobileApi/news/` (docs/api-reference.md "Tickets,
// notifications, feedback, devices, and news"). The endpoint's OK response is
// a DRF-paginated envelope whose `result` is `{count, next, previous,
// results: [NewsArticleSerializer, ...]}`; the doc doesn't enumerate
// NewsArticleSerializer's fields (just "..."), so the field names read below
// (title/description/category/created_at/image/read_time) are a plausible
// Django/DRF guess — see __fixtures__/news.json — and every one of them has a
// fallback so a sparsely-populated article never breaks NewsCard/
// NewsDetailPage, which read `{id, cat, ts, date, title, excerpt, read, seed}`
// (matching src/api/mock/news.js's NEWS shape).

const CAT_FALLBACK = 'Announcement' // a safe, generic bucket; also CATS[1] in mock/news.js
const READ_FALLBACK = '2 min' // the API has no reading-time field at all — NewsDetailPage
// only needs *a* parseable "N min" string (`parseInt(item.read, 10)`)

// Sortable YYYYMMDD integer, mirroring mock/news.js's `ts` convention
// (applyNewsQuery's sort/old comparator subtracts `ts` values directly).
function tsFromDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

// Human date string in the same format mock/news.js hand-wrote, e.g. "Jun 6, 2026".
function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC', // pin to UTC so the formatted date doesn't shift across CI/local timezones
  }).format(d)
}

export function adaptNewsItem(dto = {}) {
  return {
    id: dto.id,
    cat: dto.category || CAT_FALLBACK,
    ts: tsFromDate(dto.created_at),
    date: formatDate(dto.created_at),
    title: dto.title ?? '—',
    excerpt: dto.description ?? '', // no description yet — an empty teaser reads better than a placeholder word
    read: dto.read_time ? `${dto.read_time} min` : READ_FALLBACK,
    seed: dto.id ?? 0, // ph()/qrSvg-style placeholders index `seed % hues.length`, so any int is safe
    // `img` is optional on NewsItem (no current consumer reads it) — only
    // include it when the API actually supplies a cover image.
    ...(dto.image ? { img: dto.image } : {}),
  }
}

export function adaptNewsList(dto = {}) {
  return {
    items: (dto.results || []).map(adaptNewsItem),
    count: dto.count ?? 0,
    next: dto.next ?? null,
  }
}

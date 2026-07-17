// DTO adapter for `/mobileApi/news/`, aligned to the REAL captured payload
// (Task L1 — scratchpad/sdd/live-payloads.json `news_first`), which
// supersedes the I4 guess: articles are TRILINGUAL, with `name_ge/name_ru/
// name_en`, `desc_*`, and `content_*` (an HTML string) instead of the
// guessed `title/description/category/read_time` fields, plus `created_at`
// ("YYYY-MM-DD HH:MM:SS"), `featured_image` (absolute URL), `pinned`, and
// `published`. There is NO category field and NO reading-time field.
//
// The adapter picks the name_/desc_/content_ variant for the caller's UI
// language (i18next 'ka' maps to the API's 'ge' suffix via langToApi),
// falling back to English. Callers (endpoints/news.js) pass i18n.language;
// the default 'en' keeps this module usable from plain Node
// (scripts/live-smoke.mjs imports it directly, so no i18n import here).
import { langToApi } from '../../utils/lang.js'

const CAT_FALLBACK = 'Announcement' // no category on the live payload — see NewsDetailPage/NewsCard, which hide the chip in real mode
const READ_FALLBACK = '2 min' // no reading-time field — NewsDetailPage only needs *a* parseable "N min" string

// Live `created_at` is "YYYY-MM-DD HH:MM:SS" (no timezone). Treat it as UTC
// — normalizing to ISO with a Z — so ts/date grouping doesn't shift across
// CI/local timezones. ISO-with-timezone strings pass through untouched.
function parseCreatedAt(value) {
  if (!value) return null
  const iso = typeof value === 'string' && value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

// Sortable YYYYMMDD integer, mirroring mock/news.js's `ts` convention
// (applyNewsQuery's sort/old comparator subtracts `ts` values directly).
function tsFromDate(value) {
  const d = parseCreatedAt(value)
  if (!d) return 0
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

// Human date string in the same format mock/news.js hand-wrote, e.g. "Jun 6, 2026".
function formatDate(value) {
  const d = parseCreatedAt(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

// name_ge/name_ru/name_en -> the value for `lang` (UI code), EN fallback.
function pickLang(dto, base, lang) {
  const api = langToApi(lang)
  return dto[`${base}_${api}`] || dto[`${base}_en`] || ''
}

export function adaptNewsItem(dto = {}, lang = 'en') {
  return {
    id: dto.id,
    cat: CAT_FALLBACK,
    ts: tsFromDate(dto.created_at),
    date: formatDate(dto.created_at),
    title: pickLang(dto, 'name', lang) || '—',
    excerpt: pickLang(dto, 'desc', lang),
    // Raw CMS HTML — NewsDetailPage renders it via dangerouslySetInnerHTML
    // inside its existing prose wrapper (first-party CMS content).
    body: pickLang(dto, 'content', lang),
    read: READ_FALLBACK,
    seed: dto.id ?? 0, // ph()/qrSvg-style placeholders index `seed % hues.length`, so any int is safe
    pinned: Boolean(dto.pinned),
    // `img` is optional on NewsItem — only included when the API supplies a
    // cover image (live: an absolute https URL).
    ...(dto.featured_image ? { img: dto.featured_image } : {}),
  }
}

export function adaptNewsList(dto = {}, lang = 'en') {
  return {
    items: (dto.results || []).map((item) => adaptNewsItem(item, lang)),
    count: dto.count ?? 0,
    next: dto.next ?? null,
  }
}

// DTO adapters for `/mobileApi/internettv/` and `/mobileApi/internettv/tariff/`
// (docs/api-reference.md "Internet and TV"). Both response shapes are
// doc-elided beyond a couple of top-level keys:
//  - `/internettv/` (and `/internettv/{id}/`) returns "latest agreement
//    serializer object, or {} when inactive/not found" — no field names at
//    all, so the names read below (provider/tariff_net_id/price/status/
//    next_billing_date/billing_cycle_days/days_left/boost) are a plausible
//    guess — see __fixtures__/internettv-agreement.json — FLAG for live
//    verification.
//  - `/internettv/tariff/` gives the top-level `{internet:[],tv:[],boost:[],
//    combined:[]}` shape verbatim, but never shows what's inside each array;
//    the per-entry field names below (price/internet_speed_mbps/
//    tv_channel_count/extra_mbps/duration_value/duration_unit) are likewise
//    an invented-but-flagged guess — see __fixtures__/internettv-tariff.json.
//
// Together these adapters produce the two internet-service pieces
// `/properties/` can't supply (see adaptServicesFromProperty's fallback
// comment in apartments.js): the v1 PLANS/BOOSTS catalog (src/api/mock/
// plans.js shape) and the subscriber's own plan/boost/renewal state
// (src/api/mock/services.js's `services.internet` shape). Callers merge
// `adaptAgreement(...)` on top of `adaptServicesFromProperty(...).internet`
// (which already owns `balance` from `/properties/`).

function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "D MMM YYYY" — matches the hand-written renewal strings in
// src/api/mock/services.js (e.g. "19 Jul 2026"), which InternetCard/
// ChangePackageModal/BoostModal render as-is (no further date parsing).
function formatRenewal(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// API status string -> the Capitalized values InternetCard's `s.status ===
// 'Active'/'Paused'` checks read. Anything else (including a missing
// agreement, i.e. `{}`) falls through to `null`, matching
// adaptServicesFromProperty's conservative default and InternetCard's
// `!s.planId` empty-state gate.
const STATUS_MAP = { active: 'Active', paused: 'Paused' }

// Shared by the tariff catalog's `boost` array and an agreement's own active
// boost sub-object — both are guessed to use the same extra_mbps/
// duration_value/duration_unit fields (FLAG: verify once real payloads are
// available). Formats the display strings BoostModal/InternetCard read
// verbatim (`"+65 Mbps"`, `"24 hours"`/`"7 days"`), matching src/api/mock/
// plans.js's BOOSTS entries exactly.
function adaptBoostEntry(dto = {}) {
  return {
    id: dto.id,
    name: dto.name ?? '—',
    price: num(dto.price),
    speed: dto.extra_mbps != null ? `+${dto.extra_mbps} Mbps` : '—',
    duration: dto.duration_value != null && dto.duration_unit ? `${dto.duration_value} ${dto.duration_unit}` : '—',
  }
}

// Maps one `combined` tariff entry (an internet+TV package) into the v1
// PLANS shape (src/api/mock/plans.js: `{id,name,price,mbps,ch}`).
function adaptPlanEntry(dto = {}) {
  return {
    id: dto.id,
    name: dto.name ?? '—',
    price: num(dto.price),
    mbps: num(dto.internet_speed_mbps),
    ch: num(dto.tv_channel_count),
  }
}

// `/internettv/tariff/`'s `{internet,tv,boost,combined}` -> `{plans, boosts}`.
// Per the brief, `combined` (not `internet`/`tv` individually) is the v1
// PLANS catalog — the internet+TV bundles are what ChangePackageModal
// actually offers; standalone internet-only/TV-only tariffs have no v1 UI
// consumer yet, so they're intentionally not surfaced here.
export function adaptTariffs(dto = {}) {
  return {
    plans: (dto.combined || []).map(adaptPlanEntry),
    boosts: (dto.boost || []).map(adaptBoostEntry),
  }
}

// `/internettv/` (or `/internettv/{id}/`) -> the subscriber-state half of
// `services.internet` (provider/planId/tariff/renewal/daysLeft/cycleDays/
// boost/status). `balance` is deliberately omitted — that field is owned by
// adaptServicesFromProperty (apartments.js), which reads it from
// `/properties/`'s InternetTVBalanceGEL instead. An empty/missing agreement
// (`{}`, per the doc's "or {} when inactive/not found") falls back to the
// same "no active subscription" shape adaptServicesFromProperty already
// produces, so InternetCard's `!s.planId` empty state renders correctly
// either way.
export function adaptAgreement(dto = {}) {
  return {
    provider: dto.provider ?? '—',
    planId: dto.tariff_net_id ?? null,
    tariff: num(dto.price),
    renewal: dto.next_billing_date ? formatRenewal(dto.next_billing_date) : '—',
    daysLeft: num(dto.days_left),
    cycleDays: num(dto.billing_cycle_days),
    boost: dto.boost ? adaptBoostEntry(dto.boost) : null,
    status: STATUS_MAP[dto.status] || null,
  }
}

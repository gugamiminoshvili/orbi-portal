// DTO adapters for the "internet/TV agreement" shape and
// `/mobileApi/internettv/tariff/` (docs/api-reference.md "Internet and TV").
//
// Task L1 (live-verification) supersedes the I5 guesses below with the real
// shapes captured in scratchpad/sdd/live-payloads.json /
// scratchpad/sdd/live-flats-sample.json:
//  - the "agreement" shape — what `/internettv/`/`/internettv/{id}/` return,
//    AND what's embedded verbatim as `orbinet_agreement` on every
//    /properties/v2/ flat (see adapters/apartments.js) — is really
//    `{id,name,active,status,agr_status,status_name,start,end,balance_gel,
//    cost_gel,penalty_gel,net_tariff:{id,name},tv_tariff:{id,name}}`. None of
//    the I5-guessed fields (`provider`/`tariff_net_id`/`price`/
//    `next_billing_date`/`billing_cycle_days`/`days_left`/`boost`) exist.
//    FLAG: `/internettv/?flat=` itself was never captured directly in this
//    round — the doc calls it "the latest agreement serializer object",
//    which reads as the same serializer embedded on the flat, so this
//    assumes an identical shape until a live call proves otherwise.
//  - `/internettv/tariff/`'s per-entry fields are `{id,name,price,
//    internet_speed,tv_channels,internet_id,tv_id}` (combined) /
//    `{id,name,price,internet_speed,tv_channels}` (boost) — no
//    `internet_speed_mbps`/`tv_channel_count`/`extra_mbps`/`duration_value`/
//    `duration_unit` fields.

function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MS_PER_DAY = 86400000

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// "D MMM YYYY" — matches the hand-written renewal strings in
// src/api/mock/services.js (e.g. "19 Jul 2026"), which InternetCard/
// ChangePackageModal/BoostModal render as-is (no further date parsing).
function formatRenewal(d) {
  if (!d) return '-'
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// `status_name` -> the Capitalized values InternetCard's `s.status ===
// 'Active'/'Paused'` checks read. FLAG: only 'active' has been observed on a
// live payload; 'paused' is assumed by parallel construction — no paused
// agreement sample has been captured yet. Anything else (including a
// missing/empty agreement) falls through to `null`, matching
// adaptServicesFromProperty's conservative default and InternetCard's
// `!s.planId` empty-state gate.
const STATUS_MAP = { active: 'Active', paused: 'Paused' }

// Maps one `combined` (internet+TV bundle) tariff entry into the v1 PLANS
// shape (src/api/mock/plans.js: `{id,name,price,mbps,ch}`), plus `netId`/
// `tvId`. Those two matter beyond display: the live combined-tariff sample's
// own `internet_id`/`tv_id` are the SAME id space as a flat's
// `orbinet_agreement.net_tariff.id`/`tv_tariff.id` (adaptAgreement's
// `planId` below) — i.e. what ChangePackageModal needs to mark the current
// plan, and exactly the two ids /internettv/update_package/ expects
// (see endpoints/apartments.js's changePackage: `tariff_net_id`/`tariff_tv_id`).
function adaptPlanEntry(dto = {}) {
  return {
    id: dto.id,
    name: dto.name ?? '-',
    price: num(dto.price),
    mbps: num(dto.internet_speed),
    ch: num(dto.tv_channels),
    netId: dto.internet_id ?? null,
    tvId: dto.tv_id ?? null,
  }
}

// A standalone `boost` tariff entry. Unlike the I5 guess, the live sample
// has no duration field of any kind — `duration` has nothing to read and
// always falls back to the placeholder. FLAG for verification.
function adaptBoostEntry(dto = {}) {
  return {
    id: dto.id,
    name: dto.name ?? '-',
    price: num(dto.price),
    speed: dto.internet_speed != null && dto.internet_speed !== '' ? `+${dto.internet_speed} Mbps` : '-',
    duration: '-', // FLAG: no duration_value/duration_unit (or equivalent) field on the live boost tariff shape
  }
}

// `/internettv/tariff/`'s `{internet,tv,boost,combined}` -> `{plans, boosts}`.
// Per the original brief, `combined` (not `internet`/`tv` individually) is
// the v1 PLANS catalog — the internet+TV bundles are what ChangePackageModal
// actually offers.
export function adaptTariffs(dto = {}) {
  return {
    plans: (dto.combined || []).map(adaptPlanEntry),
    boosts: (dto.boost || []).map(adaptBoostEntry),
  }
}

// One `orbinet_agreement`-shaped object -> the subscriber-state half of
// `services.internet` (everything except `balance`, which
// adapters/apartments.js's adaptServicesFromProperty owns — it reads the
// flat's own InternetTVBalanceGEL, a sibling field of `orbinet_agreement`
// on the flat payload, not anything inside the agreement itself). An empty/
// missing agreement (`{}`) falls back to the same "no active subscription"
// shape adaptServicesFromProperty already produces, so InternetCard's
// `!s.planId` empty state renders correctly either way.
export function adaptAgreement(dto = {}) {
  const hasAgreement = dto && Object.keys(dto).length > 0
  if (!hasAgreement) {
    return {
      provider: '-',
      planId: null,
      planName: '-',
      tariff: 0,
      renewal: '-',
      daysLeft: 0,
      cycleDays: 0,
      boost: null,
      status: null,
      penalty: 0,
    }
  }
  const start = parseDate(dto.start)
  const end = parseDate(dto.end)
  const now = new Date()
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY)) : 0
  const cycleDays = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)) : 0
  return {
    provider: '-', // FLAG: no ISP/provider-name field anywhere on orbinet_agreement
    planId: dto.net_tariff?.id ?? null,
    planName: dto.net_tariff?.name ?? '-',
    tariff: num(dto.cost_gel),
    renewal: formatRenewal(end),
    daysLeft,
    cycleDays,
    boost: null, // FLAG: no boost sub-object on orbinet_agreement — an active boost isn't surfaced by this shape at all
    status: STATUS_MAP[dto.status_name] || null,
    // Present on the one live (active, not paused) sample captured — so its
    // presence is NOT itself a "paused" signal, just a standalone fee the
    // account happens to carry. Exposed on the adapted object for a future
    // UI hookup; no current consumer reads it.
    penalty: num(dto.penalty_gel),
  }
}

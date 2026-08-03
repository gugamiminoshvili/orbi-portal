// DTO adapters for `/mobileApi/properties/v2/` and `/mobileApi/flat/{flat_id}/`,
// aligned to REAL captured payloads (Task L1 — scratchpad/sdd/live-payloads.json
// and live-flats-sample.json), which supersede docs/api-reference.md's examples
// where they differ:
//  - `/properties/v2/` returns COMPLEXES `[{id, name, flats: [...]}]`, not a
//    bare flat list. Flattening happens in endpoints/apartments.js; each
//    element handed to adaptProperty here is one FLAT record.
//  - A flat carries THREE variants of each money field (e.g. apartmentBalance
//    in the contract currency, apartmentBalanceGEL, apartmentBalanceCurrency/
//    apartmentCurrencyRate). Electricity and internet are GEL-native, so
//    their *GEL variants are read below; MAINTENANCE is billed in the
//    contract currency (live: USD) and is read from the un-converted
//    `apartmentBalance` + `apartmentBalanceCurrency` (owner call 2026-07-30).
//    The live sign convention matches the v1 mock exactly: negative = owed
//    (live apartmentBalance -637.12 / InternetTVBalanceGEL -69.13 are debts),
//    so values pass through un-negated.
//  - Each flat embeds its internet subscription as `orbinet_agreement`
//    (empty {} when there is no plan) — services.internet is synthesized
//    from it via adapters/internet.js's adaptAgreement.
import { symbolFor } from '../../utils/format.js'
import { adaptAgreement } from './internet.js'

// Live flats carry `ownership_status` ("owner" observed) plus
// `apartmentCategory` ("OWN - OWNER"). Only the owner value has been seen on
// a live payload — co_owner/trustee are still the doc's vocabulary, assumed
// by parallel construction. FLAG: unmapped/missing values default to
// 'Owner', mirroring the `ROLE_STYLE[apt.role] || ROLE_STYLE.Owner` fallback
// ApartmentCard/ApartmentDetailPage already apply.
const ROLE_BY_OWNERSHIP = {
  owner: 'Owner',
  co_owner: 'Co-Owner',
  trustee: 'Trusted',
}

// `apartmentCategory` is "CODE - Label" (live: "OWN - OWNER" on the list,
// "OWN - Owner" on /flat/) — the role is the part after ' - ', normalized
// case-insensitively into the ROLE_STYLE vocabulary.
const ROLE_BY_CATEGORY = {
  owner: 'Owner',
  'co-owner': 'Co-Owner',
  co_owner: 'Co-Owner',
  trustee: 'Trusted',
  trusted: 'Trusted',
}

function roleFromCategory(category) {
  if (typeof category !== 'string' || !category.includes(' - ')) return null
  const label = category.split(' - ')[1].trim().toLowerCase()
  return ROLE_BY_CATEGORY[label] || null
}

// The id the BACKEND keys flats off (what /flat/{flat_id}/ and the internet
// mutations' `flat_id` expect) is `objectId` (live: 9910), NOT the
// property-relation `id` (748) the UI routes on. Every call site that sends
// a flat id to the API must go through this helper. Mock apartments have no
// objectId, so their own id ('A1'...) passes through untouched.
export function flatId(apartment) {
  return apartment?.objectId ?? apartment?.id
}

// Balances may arrive as numbers (live) or strings (doc examples). Parse
// defensively: a missing or non-numeric value becomes 0 rather than NaN,
// since balances flow straight into fmt() (utils/format.js) and arithmetic
// (`neg = balance < 0`, PayPage's `-apt.balance`) that must not see NaN.
function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

// Maps one FLAT record (an element of a complex's `flats` array from
// `/properties/v2/`) into the v1 Apt shape + a `services` object synthesized
// from the flat's balance/indication/counter fields and its embedded
// `orbinet_agreement`.
export function adaptProperty(dto = {}) {
  return {
    id: dto.id ?? dto.objectId,
    // `objectId` is kept alongside `id` — it's the id `/flat/{flat_id}/`
    // expects (live flat: id 748 vs objectId 9910; both present).
    objectId: dto.objectId ?? dto.id,
    project: dto.complex ?? '-',
    code: dto.apartmentName ?? '-',
    block: dto.block ?? '-',
    number: dto.room_number != null ? String(dto.room_number) : '-',
    floor: num(dto.floor),
    area: num(dto.square),
    epcode: dto.epcode ?? '-',
    balance: num(dto.apartmentBalanceGEL ?? dto.apartmentBalance),
    role: ROLE_BY_OWNERSHIP[dto.ownership_status] || roleFromCategory(dto.apartmentCategory) || 'Owner',
    services: adaptServicesFromProperty(dto),
  }
}

// The flat record carries everything the 4 service accordions render except
// a few date/tariff fields with no live source anywhere yet:
//  - maintenance.tariff / maintenance.start, water.updated,
//    electricity.updated — no source field on the live payload. These are
//    UNKNOWN, not zero, so the numeric ones are null and the card renders a
//    '-' placeholder; a literal "0.00 $" monthly tariff read as a real
//    (free) price.
//  - electricity.status has no direct field either; `display_services`
//    (live: ["electricity","water","orbinet","maintenance","doors"]) is the
//    closest signal — a flat whose display_services lists electricity is
//    treated as Active. FLAG: this is an inference, not a status field.
//  - services.internet comes from the embedded orbinet_agreement
//    (adaptAgreement) plus the flat's own InternetTVBalanceGEL for
//    `balance` — negative-when-owed on the live payload, same convention
//    InternetCard's `neg = s.balance < 0` / `fmt(-s.balance)` already
//    expect, so no sign flip.
function adaptServicesFromProperty(dto = {}) {
  const displayServices = Array.isArray(dto.display_services) ? dto.display_services : []
  return {
    // Maintenance is billed in the CONTRACT currency (live: USD) — owner
    // call 2026-07-30, so the card shows `apartmentBalance` + its
    // `apartmentBalanceCurrency` rather than the pre-converted
    // `apartmentBalanceGEL` the page used to render. A payload with only the
    // GEL variant (mock, or a flat with no contract currency) falls back to
    // it and stays in ₾.
    maintenance: dto.apartmentBalance != null
      ? {
          balance: num(dto.apartmentBalance),
          currency: symbolFor(dto.apartmentBalanceCurrency, '$'),
          tariff: null, // no source field on the live flat payload
          start: '-', // no source field on the live flat payload
        }
      : {
          balance: num(dto.apartmentBalanceGEL),
          currency: '₾',
          tariff: null,
          start: '-',
        },
    water: {
      counter: dto.waterCode ?? '-',
      indication: dto.WaterIndication ?? '-',
      updated: '-', // no source field on the live flat payload
    },
    electricity: {
      counter: dto.electricityMeterNo ?? '-',
      status: displayServices.includes('electricity') ? 'Active' : 'Inactive',
      balance: num(dto.electricityBalanceGEL ?? dto.electricityBalance),
      updated: '-', // no source field on the live flat payload
    },
    internet: {
      ...adaptAgreement(dto.orbinet_agreement || {}),
      balance: num(dto.InternetTVBalanceGEL),
    },
  }
}

// Maps `/mobileApi/flat/{flat_id}/`'s real payload (live-payloads.json
// `flat_detail`) into the detail-page-only fields ApartmentDetailPage/
// PayPage read that adaptProperty can't supply. Real field names: `cadastre`
// (NOT the list's `cadastralCode`, and not the I4-guessed `cadastral_code`),
// `waterCode`, `pCounter`/`wCounter`, `epcode`, `apartmentCategory`,
// `number`, `apartmentName`, `complex`, `block`, `square`, `floor`,
// `display_services`. There is no building-name or street-address field —
// `building` is synthesized "Complex, Block X" (the exact string shape the
// v1 mock used), and there is nothing to read for a street address at all.
export function adaptFlatDetail(dto = {}) {
  return {
    id: dto.id,
    project: dto.complex ?? '-',
    code: dto.apartmentName ?? '-',
    block: dto.block ?? '-',
    number: dto.number != null ? String(dto.number) : '-',
    floor: num(dto.floor),
    area: num(dto.square),
    building: dto.complex ? (dto.block ? `${dto.complex}, Block ${dto.block}` : dto.complex) : '-',
    cadastral: dto.cadastre ?? '-',
    waterCode: dto.waterCode ?? '-',
    // The doors/QR "ap code": epcode is the only code-like candidate on the
    // live payload (empty string on the captured sample -> placeholder).
    apCode: dto.epcode || '-',
    role: roleFromCategory(dto.apartmentCategory) || 'Owner',
  }
}
